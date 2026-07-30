#!/usr/bin/env python3
"""Update the bundled cp_red_npc_generator wheel from a Git tag."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from email.parser import BytesParser
from pathlib import Path


REPOSITORY_URL = "https://github.com/n0lavar/cp_red_npc_generator.git"
EXPECTED_DISTRIBUTION = "cp-red-npc-generator"
PYODIDE_VERSION = "314.0.2"
PYODIDE_BASE_URL = (
    f"https://cdn.jsdelivr.net/pyodide/v{PYODIDE_VERSION}/full/"
)
PYODIDE_RUNTIME_FILES = (
    ("pyodide.mjs", "pyodide.js"),
    ("pyodide.asm.mjs", "pyodide.asm.js"),
    ("pyodide.asm.wasm", "pyodide.asm.wasm"),
    ("python_stdlib.zip", "python_stdlib.zip"),
    ("pyodide-lock.json", "pyodide-lock.json"),
)
PYODIDE_PACKAGES = ("numpy", "micropip")
WHEEL_GLOB = "cp_red_npc_generator-*.whl"
WORKER_WHEEL_PATTERN = re.compile(
    r"""vendor/wheels/cp_red_npc_generator-[^"'\s/]+\.whl"""
)
TAG_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Update the bundled NPC generator from a Git tag."
    )
    parser.add_argument("tag", help="Tag in n0lavar/cp_red_npc_generator")
    return parser.parse_args()


def validate_tag(tag: str) -> None:
    if (
        not TAG_PATTERN.fullmatch(tag)
        or ".." in tag
        or "//" in tag
        or tag.endswith("/")
    ):
        raise ValueError(f"Unsupported Git tag name: {tag!r}")


def run(command: list[str]) -> None:
    subprocess.run(command, check=True)


def download(
    url: str,
    destination: Path,
    expected_sha256: str | None = None,
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()

    with urllib.request.urlopen(url) as response, destination.open("wb") as output:
        while chunk := response.read(1024 * 1024):
            output.write(chunk)
            digest.update(chunk)

    if expected_sha256 is not None and digest.hexdigest() != expected_sha256:
        destination.unlink(missing_ok=True)
        raise RuntimeError(f"SHA-256 mismatch for {url}.")


def verify_remote_tag(tag: str) -> None:
    run(
        [
            "git",
            "ls-remote",
            "--exit-code",
            "--tags",
            REPOSITORY_URL,
            f"refs/tags/{tag}",
            f"refs/tags/{tag}^{{}}",
        ]
    )


def build_wheel(tag: str, output_directory: Path) -> Path:
    output_directory.mkdir(parents=True, exist_ok=True)
    run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--no-deps",
            "--ignore-requires-python",
            "--wheel-dir",
            str(output_directory),
            f"git+{REPOSITORY_URL}@{tag}",
        ]
    )

    wheels = list(output_directory.glob(WHEEL_GLOB))
    if len(wheels) != 1:
        raise RuntimeError(
            f"Expected exactly one {WHEEL_GLOB} wheel, found {len(wheels)}."
        )
    return wheels[0]


def canonicalize_distribution_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def read_wheel_version(wheel_path: Path) -> str:
    with zipfile.ZipFile(wheel_path) as wheel:
        metadata_files = [
            name for name in wheel.namelist() if name.endswith(".dist-info/METADATA")
        ]
        if len(metadata_files) != 1:
            raise RuntimeError(
                "The built wheel does not contain exactly one METADATA file."
            )
        metadata = BytesParser().parsebytes(wheel.read(metadata_files[0]))

    distribution = metadata.get("Name")
    version = metadata.get("Version")
    if (
        distribution is None
        or canonicalize_distribution_name(distribution) != EXPECTED_DISTRIBUTION
    ):
        raise RuntimeError(
            f"The built wheel is not the {EXPECTED_DISTRIBUTION!r} distribution."
        )
    if version is None:
        raise RuntimeError("The built wheel does not declare a version.")
    return version


def read_wheel_requirements(wheel_path: Path) -> list[str]:
    with zipfile.ZipFile(wheel_path) as wheel:
        metadata_name = next(
            name for name in wheel.namelist() if name.endswith(".dist-info/METADATA")
        )
        metadata = BytesParser().parsebytes(wheel.read(metadata_name))

    requirements = []
    pyodide_packages = {
        canonicalize_distribution_name(name) for name in PYODIDE_PACKAGES
    }
    for requirement in metadata.get_all("Requires-Dist", []):
        match = re.match(r"^([A-Za-z0-9_.-]+)", requirement)
        if match is None:
            raise RuntimeError(f"Could not parse wheel requirement: {requirement!r}")
        name = canonicalize_distribution_name(match.group(1))
        if name in pyodide_packages or "extra ==" in requirement:
            continue
        requirements.append(requirement)
    return requirements


def download_python_dependencies(wheel_path: Path, output_directory: Path) -> None:
    requirements = read_wheel_requirements(wheel_path)
    run(
        [
            sys.executable,
            "-m",
            "pip",
            "download",
            "--only-binary=:all:",
            "--python-version=3.14",
            "--implementation=py",
            "--abi=none",
            "--platform=any",
            "--dest",
            str(output_directory),
            *requirements,
        ]
    )
    shutil.copy2(wheel_path, output_directory / wheel_path.name)

    for dependency in output_directory.glob("*.whl"):
        if dependency.name == wheel_path.name:
            continue
        if not dependency.name.endswith("-none-any.whl"):
            raise RuntimeError(
                "Bundled generator dependency is not a pure-Python wheel: "
                f"{dependency.name}"
            )


def resolve_pyodide_packages(lock: dict, requested: tuple[str, ...]) -> list[dict]:
    packages = lock.get("packages")
    if not isinstance(packages, dict):
        raise RuntimeError("The Pyodide lock file does not contain packages.")

    resolved: dict[str, dict] = {}

    def add_package(name: str) -> None:
        if name in resolved:
            return
        package = packages.get(name)
        if not isinstance(package, dict):
            raise RuntimeError(f"Pyodide package {name!r} was not found.")
        resolved[name] = package
        for dependency in package.get("depends", []):
            add_package(dependency)

    for package_name in requested:
        add_package(package_name)
    return list(resolved.values())


def download_pyodide(output_directory: Path) -> None:
    for source_name, destination_name in PYODIDE_RUNTIME_FILES:
        print(f"Downloading Pyodide runtime file {source_name}...")
        download(
            PYODIDE_BASE_URL + source_name,
            output_directory / destination_name,
        )

    entrypoint = output_directory / "pyodide.js"
    entrypoint_source = entrypoint.read_text(encoding="utf-8")
    updated_entrypoint = entrypoint_source.replace(
        "pyodide.asm.mjs",
        "pyodide.asm.js",
    )
    if updated_entrypoint == entrypoint_source:
        raise RuntimeError("Could not rewrite the Pyodide runtime module import.")
    entrypoint.write_text(updated_entrypoint, encoding="utf-8")

    lock_path = output_directory / "pyodide-lock.json"
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    for package in resolve_pyodide_packages(lock, PYODIDE_PACKAGES):
        file_name = package.get("file_name")
        sha256 = package.get("sha256")
        if not isinstance(file_name, str) or not isinstance(sha256, str):
            raise RuntimeError("A required Pyodide package has invalid metadata.")
        print(f"Downloading Pyodide package {package['name']}...")
        download(
            PYODIDE_BASE_URL + file_name,
            output_directory / file_name,
            sha256,
        )

    download(
        "https://raw.githubusercontent.com/pyodide/pyodide/main/LICENSE",
        output_directory / "LICENSE",
    )


def update_bundle(
    repository_root: Path,
    wheel_path: Path,
    wheels_directory: Path,
    pyodide_directory: Path,
) -> str:
    wheel_directory = repository_root / "vendor" / "wheels"
    runtime_directory = repository_root / "vendor" / "pyodide"
    worker_path = repository_root / "scripts" / "workers" / "generator-worker.js"
    if not worker_path.is_file():
        raise FileNotFoundError(f"Generator worker was not found at {worker_path}.")

    worker_source = worker_path.read_text(encoding="utf-8")
    wheel_relative_path = f"vendor/wheels/{wheel_path.name}"
    updated_worker_source, replacement_count = WORKER_WHEEL_PATTERN.subn(
        wheel_relative_path, worker_source
    )
    if replacement_count != 1:
        raise RuntimeError(
            "Expected exactly one bundled wheel reference in the generator worker."
        )

    staged_wheels = sorted(path.name for path in wheels_directory.glob("*.whl"))
    if wheel_path.name not in staged_wheels:
        raise RuntimeError("The staged wheel set does not contain the generator.")

    wheel_directory.mkdir(parents=True, exist_ok=True)
    runtime_directory.mkdir(parents=True, exist_ok=True)
    for source in wheels_directory.iterdir():
        if source.is_file():
            shutil.copy2(source, wheel_directory / source.name)
    (wheel_directory / "bundled-wheels.json").write_text(
        f"{json.dumps(staged_wheels, indent=2)}\n",
        encoding="utf-8",
    )
    for source in pyodide_directory.iterdir():
        if source.is_file():
            shutil.copy2(source, runtime_directory / source.name)

    for old_wheel in wheel_directory.glob("*.whl"):
        if old_wheel.name not in staged_wheels:
            old_wheel.unlink()
    staged_runtime_files = {path.name for path in pyodide_directory.iterdir()}
    for old_runtime_file in runtime_directory.iterdir():
        if old_runtime_file.is_file() and old_runtime_file.name not in staged_runtime_files:
            old_runtime_file.unlink()

    temporary_worker_path = worker_path.with_suffix(f"{worker_path.suffix}.tmp")
    temporary_worker_path.write_text(updated_worker_source, encoding="utf-8")
    temporary_worker_path.replace(worker_path)

    return wheel_relative_path


def main() -> int:
    arguments = parse_arguments()
    validate_tag(arguments.tag)

    repository_root = Path(__file__).resolve().parent.parent
    print(f"Checking generator tag {arguments.tag!r}...")
    verify_remote_tag(arguments.tag)

    with tempfile.TemporaryDirectory(prefix="npc-generator-bundle-") as directory:
        bundle_directory = Path(directory)
        print("Building the generator wheel...")
        wheel_path = build_wheel(arguments.tag, bundle_directory / "generator")
        version = read_wheel_version(wheel_path)
        wheels_directory = bundle_directory / "wheels"
        wheels_directory.mkdir()
        print("Downloading pure-Python generator dependencies...")
        download_python_dependencies(wheel_path, wheels_directory)

        pyodide_directory = bundle_directory / "pyodide"
        pyodide_directory.mkdir()
        download_pyodide(pyodide_directory)

        wheel_relative_path = update_bundle(
            repository_root,
            wheel_path,
            wheels_directory,
            pyodide_directory,
        )

    print(f"Bundled generator updated to {version} from tag {arguments.tag!r}.")
    print(f"Wheel: {wheel_relative_path}")
    print(f"Pyodide: {PYODIDE_VERSION}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
