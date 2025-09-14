import { parseUiFile } from "./import.parse.pure";
import { injectCssClasses } from "./import.css.stage-crew";
import { createComponentsSequentially, applyHierarchyAndOrder } from "./import.nodes.stage-crew";
import { openUiFile } from "./import.file.stage-crew";

export const handlers = {
  parseUiFile,
  injectCssClasses,
  createComponentsSequentially,
  applyHierarchyAndOrder,
  openUiFile,
};
