import { localizeOrFallback } from "../utils/localization.js";

const STATUS_SELECTOR = "[data-role='statusText']";
const VIEWPORT_MARGIN = 16;

export function createStatusDialog(initialName, initialFallback, enabled = true) {
  if (!enabled) return new NullStatusDialog();
  return new GeneratorStatusDialog(initialName, initialFallback);
}

class GeneratorStatusDialog {
  constructor(initialName, initialFallback) {
    this.status = localizeOrFallback(initialName, initialFallback);
    this.state = "running";
    this.element = null;
    this.root = null;
    this.positionAtBottomRight = () => this.#positionAtBottomRight();
    this.dialog = new Dialog(
      {
        title: localizeOrFallback("StatusDialogTitle", "NPC Generator"),
        content: buildContent(this.status),
        buttons: {},
        render: (html) => {
          const content = html[0] ?? html;
          this.element = content.querySelector(STATUS_SELECTOR);
          this.root = content.closest(".app");
          this.#renderStatus();
          window.removeEventListener("resize", this.positionAtBottomRight);
          window.addEventListener("resize", this.positionAtBottomRight);
          window.requestAnimationFrame(this.positionAtBottomRight);
        },
        close: () => {
          window.removeEventListener("resize", this.positionAtBottomRight);
          this.element = null;
          this.root = null;
        }
      },
      {
        width: 430,
        classes: ["npc-generator-status-dialog"]
      }
    );
    this.dialog.render(true);
  }

  update(name, fallback) {
    this.status = localizeOrFallback(name, fallback);
    this.#renderStatus();
  }

  complete(name, fallback) {
    this.state = "complete";
    this.update(name, fallback);
    window.setTimeout(() => this.dialog.close(), 900);
  }

  fail(name, fallback) {
    this.state = "failed";
    this.update(name, fallback);
  }

  close() {
    this.dialog.close();
  }

  #renderStatus() {
    if (!this.element) return;
    this.element.textContent = this.status;
    const container = this.element.closest(".npc-generator-status");
    container?.classList.toggle("is-complete", this.state === "complete");
    container?.classList.toggle("is-failed", this.state === "failed");
  }

  #positionAtBottomRight() {
    if (!this.root) return;
    const bounds = this.root.getBoundingClientRect();
    this.dialog.setPosition({
      left: Math.max(VIEWPORT_MARGIN, window.innerWidth - bounds.width - VIEWPORT_MARGIN),
      top: Math.max(VIEWPORT_MARGIN, window.innerHeight - bounds.height - VIEWPORT_MARGIN)
    });
  }
}

class NullStatusDialog {
  update() {}
  complete() {}
  fail() {}
  close() {}
}

function buildContent(status) {
  const container = document.createElement("div");
  container.className = "npc-generator-status";

  const icon = document.createElement("i");
  icon.className = "fas fa-spinner fa-spin";
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.dataset.role = "statusText";
  text.textContent = status;
  container.append(icon, text);
  return container.outerHTML;
}
