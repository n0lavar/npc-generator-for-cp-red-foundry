#!/usr/bin/env python3
"""Update the bundled cp_red_npc_generator wheel from a Git tag."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from email.parser import BytesParser
from pathlib import Path


REPOSITORY_URL = "https://github.com/n0lavar/cp_red_npc_generator.git"
EXPECTED_DISTRIBUTION = "cp-red-npc-generator"
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
    run(
        [
            sys.executable,
            "-m",
            "pip",
            "wheel",
            "--no-deps",
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


def update_bundle(repository_root: Path, wheel_path: Path) -> str:
    wheel_directory = repository_root / "vendor" / "wheels"
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

    wheel_directory.mkdir(parents=True, exist_ok=True)
    destination = wheel_directory / wheel_path.name
    shutil.copy2(wheel_path, destination)

    temporary_worker_path = worker_path.with_suffix(f"{worker_path.suffix}.tmp")
    temporary_worker_path.write_text(updated_worker_source, encoding="utf-8")
    temporary_worker_path.replace(worker_path)

    for old_wheel in wheel_directory.glob(WHEEL_GLOB):
        if old_wheel != destination:
            old_wheel.unlink()

    return wheel_relative_path


def main() -> int:
    arguments = parse_arguments()
    validate_tag(arguments.tag)

    repository_root = Path(__file__).resolve().parent.parent
    print(f"Checking generator tag {arguments.tag!r}...")
    verify_remote_tag(arguments.tag)

    with tempfile.TemporaryDirectory(prefix="npc-generator-bundle-") as directory:
        print("Building the generator wheel...")
        wheel_path = build_wheel(arguments.tag, Path(directory))
        version = read_wheel_version(wheel_path)
        wheel_relative_path = update_bundle(repository_root, wheel_path)

    print(f"Bundled generator updated to {version} from tag {arguments.tag!r}.")
    print(f"Wheel: {wheel_relative_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Error: {error}", file=sys.stderr)
        raise SystemExit(1) from error
