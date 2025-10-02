import { handlers as createHandlers } from './symphonies/create/create.stage-crew';
import { startResize, updateSize, endResize } from './symphonies/resize/resize.stage-crew';
import { showSelectionOverlay, hideSelectionOverlay, routeSelectionRequest, notifyUi as notifyUiSelection, publishSelectionChanged } from './symphonies/select/select.stage-crew';
import { showSvgNodeOverlay } from './symphonies/select/select.svg-node.stage-crew';
import { startLineResize, updateLine, endLineResize } from './symphonies/resize-line/resize.line.stage-crew';
import { startDrag, updatePosition, endDrag, forwardToControlPanel } from './symphonies/drag/drag.stage-crew';
import { openUiFile } from './symphonies/import/import.file.stage-crew';
import { parseUiFile } from './symphonies/import/import.parse.pure';
import { injectCssClasses } from './symphonies/import/import.css.stage-crew';
import { createComponentsSequentially, applyHierarchyAndOrder } from './symphonies/import/import.nodes.stage-crew';
import { updateAttribute, refreshControlPanel } from './symphonies/update/update.stage-crew';
import { notifyUi } from './symphonies/create/create.notify';
// export handlers
import { queryAllComponents } from './symphonies/export/export.io';
import { discoverComponentsFromDom } from './symphonies/export/export.discover.stage-crew';
import { collectCssClasses } from './symphonies/export/export.css.stage-crew';
import { collectLayoutData } from './symphonies/export/export.stage-crew';
import { buildUiFileContent } from './symphonies/export/export.pure';
import { downloadUiFile } from './symphonies/export/export.download.stage-crew';
import { exportSvgToGif } from './symphonies/export/export.gif.stage-crew';
import { exportSvgToMp4 } from './symphonies/export/export.mp4.stage-crew';
import { updateSvgNodeAttribute } from './symphonies/update/update.svg-node.stage-crew';
import { startLineManip, moveLineManip, endLineManip } from './symphonies/line-advanced/line.manip.stage-crew';
import { hideAllOverlays, deselectComponent, publishDeselectionChanged, publishSelectionsCleared, routeDeselectionRequest as routeDeselectionRequestDeselection } from './symphonies/deselect/deselect.stage-crew';
import { deleteComponent, publishDeleted, routeDeleteRequest as routeDeleteRequestDelete } from './symphonies/delete/delete.stage-crew';

// Minimal merged handlers to support JSON-mounted sequences
export const handlers = {
  // create
  ...createHandlers,
  notifyUi,
  // select
  showSelectionOverlay,
  hideSelectionOverlay,
  showSvgNodeOverlay,
  routeSelectionRequest,
  notifyUiSelection,
  publishSelectionChanged,
  // deselect
  hideAllOverlays,
  deselectComponent,
  publishDeselectionChanged,
  publishSelectionsCleared,
  routeDeselectionRequest: routeDeselectionRequestDeselection,
  // delete
  deleteComponent,
  publishDeleted,
  routeDeleteRequest: routeDeleteRequestDelete,
  // drag
  startDrag,
  updatePosition,
  endDrag,
  forwardToControlPanel,
  // import
  openUiFile,
  parseUiFile,
  injectCssClasses,
  createComponentsSequentially,
  applyHierarchyAndOrder,
  // export
  queryAllComponents,
  discoverComponentsFromDom,
  collectCssClasses,
  collectLayoutData,
  buildUiFileContent,
  downloadUiFile,
  exportSvgToGif,
  exportSvgToMp4,
  // resize
  startResize,
  updateSize,
  endResize,
  // resize-line
  startLineResize,
  updateLine,
  endLineResize,
  // line-advanced manip
  startLineManip,
  moveLineManip,
  endLineManip,
  // update
  updateAttribute,
  refreshControlPanel,
  updateSvgNodeAttribute,
};

export async function register(conductor: any) {
  try {
    if (conductor && (conductor as any)._canvasComponentRegistered) return;
    if (conductor) (conductor as any)._canvasComponentRegistered = true;
  } catch {}
}
