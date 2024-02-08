import { SelectableMesh } from "../objects/SelectableMesh";
import { FinishSelectionObject, SinglePhaseSelector, TwoPhaseSelector } from "../types";

import { Selectable } from "../types";
import { SelectableInstancedMesh } from "../objects/SelectableInstancedMesh";
import { MouseEventEmitter } from "./EventEmitter";
import { Camera, Raycaster, Vector2, WebGLRenderer } from "three";

export type Intersection = {object: Selectable};


let inSelectionMode = false;
let objects: (SelectableMesh | SelectableInstancedMesh)[] = [];
let selectables: Selectable[];


export class MouseEventHandler {

  _currentTarget: Selectable | null = null;
  _originOfSelection: Selectable | null = null;

  #mouseoverTarget: Selectable | null = null;
  #selector: SinglePhaseSelector | TwoPhaseSelector;

  #camera;
  #raycaster;
  #renderer;
  #mouse;

  #_onClick;
  #_onMouseout;
  #_onMousemove;

  constructor(
    camera: Camera,
    raycaster: Raycaster,
    renderer: WebGLRenderer,
    selectableObjects?: (SelectableMesh | SelectableInstancedMesh)[],
    selector?: SinglePhaseSelector | TwoPhaseSelector,
  ) {

    objects = selectableObjects || [];
    selectables = selectableObjects ? MouseEventHandler.selectablesFlatMap(selectableObjects) : [];

    this.#selector = selector || new EmptySelector();

    this.#camera = camera;
    this.#raycaster = raycaster;
    this.#renderer = renderer;
    // this.#canvas = domCanvas;
    this.#mouse = new Vector2();

    this.#_onClick = this.#onClick.bind(this);
    this.#_onMouseout = this.#onMouseout.bind(this);
    this.#_onMousemove = this.#onMousemove.bind(this);

    this.enable();
  }

  static isInstancedMesh(mesh: SelectableMesh | SelectableInstancedMesh): mesh is SelectableInstancedMesh {
    return (mesh as SelectableInstancedMesh).isInstancedMesh !== undefined;
  }

  static isTwoPhaseSelector(selector: SinglePhaseSelector | TwoPhaseSelector): selector is TwoPhaseSelector {
    return (selector as TwoPhaseSelector).handleSelectionMode != undefined;
  }

  /* Calls the callback function on each items in the array. If an instancedMesh is present, than
  each of that mesh's SelectionObjects will have the function called on them too. This function is
  specifically for calling on the "objects" array. */
  static selectablesForEach(array: (SelectableMesh | SelectableInstancedMesh)[], cb: (item: Selectable) => void) {
    array.forEach(x => {
      if (MouseEventHandler.isInstancedMesh(x)) {
        x.getSelectionObjects().forEach(obj => cb(obj));
      } else {
        cb(x);
      }
    })
  }

  /* Maps all objects to a single flattened array, regardless of whether it is
  an instancedMesh or a regular mesh. */
  static selectablesFlatMap(array: (SelectableMesh | SelectableInstancedMesh)[]): Selectable[] {
    return array.map(x => MouseEventHandler.isInstancedMesh(x) ? x.getSelectionObjects() : x).flat();
  }

  enable() {
    this.#renderer.domElement.addEventListener("click", this.#_onClick);
    this.#renderer.domElement.addEventListener("mousemove", this.#_onMousemove);
    this.#renderer.domElement.addEventListener("mouseout", this.#_onMouseout);
  }

  dispose() {
    this.#renderer.domElement.removeEventListener("click", this.#_onClick);
    this.#renderer.domElement.removeEventListener("mousemove", this.#_onMousemove);
    this.#renderer.domElement.removeEventListener("mouseout", this.#_onMouseout);
  }

  setSelector(selector: SinglePhaseSelector | TwoPhaseSelector) {
    this.#selector = selector;
    if (!MouseEventHandler.isTwoPhaseSelector(selector)) {
      inSelectionMode = false;
    }
  }

  getSelector() {
    return this.#selector;       
  }

  setObjects(newObjects: (SelectableMesh | SelectableInstancedMesh)[]) {
    objects = newObjects;
    selectables = MouseEventHandler.selectablesFlatMap(newObjects);
  }

  getObjects() {
    return objects;
  }

  #onClick() {

    if (this._currentTarget) {   // If the mouse is over a clickable target

      if (inSelectionMode) {

        if (this.#selector.isSelectionValid) {
          MouseEventEmitter.dispatch("selectionFinished", this.#selector.handleSelectionFinished(this._currentTarget));
          this.#clearSelection();
        }

      } else {

        if (MouseEventHandler.isTwoPhaseSelector(this.#selector)) {
          this.#selector.handleFirstClick(this._currentTarget);
          inSelectionMode = true;
          this._originOfSelection = this._currentTarget;
        } else {

          // We will always end up here for Single Phase Selectors
          if (this.#selector.isSelectionValid) {
            MouseEventEmitter.dispatch("selectionFinished", this.#selector.handleSelectionFinished(this._currentTarget));
            this.#clearSelection();
          }
        }

        this._currentTarget = null;
      }

    } else {

      if (inSelectionMode) {
        this.#clearSelection();
      }

    }
  }

  #clearSelection() {

    objects.forEach(meshObj => {
      if (MouseEventHandler.isInstancedMesh(meshObj)) meshObj.unselectAndUnhoverAll();
      else meshObj.unselectAndUnhover();
    });

    this._originOfSelection = null;
    this._currentTarget = null;
    this.#mouseoverTarget = null;
    inSelectionMode = false;

  }


  /** Checks whether the mouse is hovering over a mesh, and filters out
   * repeated mouseover events on the same mesh. Also calls
   * #callbackOnHover. Does NOT check if the mesh is currently selectable.
  */
  #getValidTarget(intersections: Intersection[]): Selectable | null {
    if (intersections.length === 0) {
      if (this._currentTarget && !inSelectionMode)
        this.#selector.handleMouseLeaveBoard(this._currentTarget);
      this._currentTarget = null;
      this.#mouseoverTarget = null;
      MouseEventEmitter.dispatch("hover", {target: null, objects: null});
      return null;
    }

    if (intersections[0].object === this.#mouseoverTarget) return null;

    this.#mouseoverTarget = intersections[0].object;

    MouseEventEmitter.dispatch("hover", {target: this.#mouseoverTarget, objects: null});
    this.#selector.handleMouseOverAnyTarget(this.#mouseoverTarget);

    return this.#mouseoverTarget;

  }

  #getIntersectedObject(e: MouseEvent) {
    this.#raycaster.setFromCamera(this.#getPointerCoordinates(e), this.#camera);
    return (this.#raycaster.intersectObjects(objects, false) as unknown) as Intersection[];
  }

  #getPointerCoordinates(e: MouseEvent) {
    /* Use the commented-out code if we are going to
    change the size of the canvas so that it is not full-screen */
    // const rect = this.#canvas.getBoundingClientRect();
    // this.#mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    // this.#mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.#mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.#mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    return this.#mouse;
  }


  #onMousemove(e: MouseEvent) {
    
    const mouseoverTarget = this.#getValidTarget(this.#getIntersectedObject(e));
    if (mouseoverTarget === null) return;

    if (inSelectionMode) {

      this._currentTarget = mouseoverTarget;
      
      if (MouseEventHandler.isTwoPhaseSelector(this.#selector))
        // In selection mode, _originOfSelection will not be null
        this.#selector.handleSelectionMode(this._originOfSelection!, this._currentTarget);

    } else {

      if (mouseoverTarget.isSelectable()) {

        if (!mouseoverTarget.isOccupied() || this.#selector.getAllowStack()) {

          if (this._currentTarget) this.#selector.handleMouseLeaveTarget(this._currentTarget);
          this._currentTarget = mouseoverTarget;
          this.#selector.handleMouseOverValidTarget(mouseoverTarget);

        } 
        else this.#mouseLeftValidTarget(); 


      } else this.#mouseLeftValidTarget();
        
    }

  }

  #mouseLeftValidTarget() {
    if (this._currentTarget != null) {
      this.#selector.handleMouseLeaveTarget(this._currentTarget);
      this._currentTarget = null;
    }
  }

  #onMouseout() {
    this.#clearSelection();
    MouseEventEmitter.dispatch("hover", {target: null, objects: null});
  }

}













/** The Empty Selector does nothing and returns nothing. It is
 * used to disable mouse selection. Note however, that the 
 * MouseEventHandler will still dispatch mouse events to
 * any subscriptors.
  */

export class EmptySelector implements SinglePhaseSelector {
  handleMouseOverAnyTarget(target: Selectable) {}
  handleMouseOverValidTarget(target: Selectable) {}
  handleMouseLeaveTarget(target: Selectable) {}
  handleMouseLeaveBoard(target: Selectable) {}
  getAllowStack() {return false;}
  setAllowStack(val: boolean) {}
  handleSelectionFinished(target: Selectable) {
    return {objects: null, target: null, data: {
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      lengthX: 0,
      lengthY: 0,
      totalArea: 0,
      validCount: 0,
    }}
  }
  setMaxRectangleSize(length: number, width: number) {}

  isSelectionValid = false;
}











/** FlexibleRectangleSelector allows the user to select all
 * items within a flexibly-sized rectangle. A max size can be set,
 * as well as if the selection should be invalidated if unselectable
 * objects are contained within the rectangle.
  */

export class FlexibleRectangleSelector implements TwoPhaseSelector {
  
  isSelectionValid = true;

  #minX = Number.MAX_SAFE_INTEGER; 
  #maxX = Number.MIN_SAFE_INTEGER; 
  #minY = Number.MAX_SAFE_INTEGER;
  #maxY = Number.MIN_SAFE_INTEGER;
  #lengthX = 0;
  #lengthY = 0;
  #totalCount = 0;
  #validCount = 0;

  #insideRect: Selectable[] = [];
  #outsideRect: Selectable[] = [];
  #maxLength;
  #maxWidth;
  #allowIncompleteRectangles;
  #allowStack;
  
  constructor(
    allowIncompleteRectangles?: boolean, 
    allowStack?: boolean,
    maxLength?: number, 
    maxWidth?: number) {
    this.#maxLength = maxLength || -1;
    this.#maxWidth = maxWidth || -1;
    this.#allowIncompleteRectangles = allowIncompleteRectangles == undefined ? true : allowIncompleteRectangles;
    this.#allowStack = allowStack == undefined ? false : allowStack;
  }

  getAllowStack() {return this.#allowStack;}

  setAllowStack(val: boolean) {this.#allowStack = val;}

  /** Set to any number, or to -1 to turn off size restrictions */
  setMaxRectangleSize(length: number, width: number) {
    this.#maxLength = length;
    this.#maxWidth = width;
  }

  setExactRectangle(val: boolean) {
    this.#allowIncompleteRectangles = val;
  }

  handleMouseOverValidTarget(target: Selectable) {
    target.hover();
  }

  handleMouseOverAnyTarget(target: Selectable) {}

  handleMouseLeaveTarget(target: Selectable) {
    target.unhover();
  }

  handleMouseLeaveBoard(target: Selectable) {
    target.unselectAndUnhover();
  }

  handleFirstClick(target: Selectable) {
    target.select()
  }

  handleSelectionFinished(target: Selectable): FinishSelectionObject {
    const selection: Selectable[] = [];

    selectables
      .filter(x => x.isSelectedOrHovered())
      .forEach(x => selection.push(x));

    return {
      objects: selection,
      target: target,
      data: {
        minX: this.#minX,
        maxX: this.#maxX,
        minY: this.#minY,
        maxY: this.#maxY,
        lengthX: this.#lengthX,
        lengthY: this.#lengthY,
        totalArea: this.#totalCount,
        validCount: this.#validCount,
      }
    };
  }


  handleSelectionMode(origin: Selectable, target: Selectable) {

    this.#setMinMaxCoordinates(origin, target);
    this.#findObjectsThatAreInsideAndOutsideRect();

    this.#lengthX = Math.abs((this.#maxX - this.#minX)) + 1;
    this.#lengthY = Math.abs((this.#maxY - this.#minY)) + 1;
    this.#totalCount = this.#lengthX * this.#lengthY;

    const selectionTooBig = 
      (this.#maxLength != -1 ? this.#lengthX > this.#maxLength : false) ||
      (this.#maxWidth != -1 ? this.#lengthY > this.#maxWidth : false)

    const selectionContainsUnselectables = 
      this.#allowIncompleteRectangles ? false :
      this.#insideRect.length < this.#totalCount;

    if (selectionContainsUnselectables || selectionTooBig) {
      this.#addRectSelectionEffect(false);
    } else {
      this.#addRectSelectionEffect(true);
    }

  }

  #setMinMaxCoordinates(origin: Selectable, target: Selectable) {

    /* If we use different cubes, we may have to update the coordinates */
    const originX = origin.getCoordinates().x, originY = origin.getCoordinates().y;
    const targetX = target.getCoordinates().x, targetY = target.getCoordinates().y;

    if (originX < targetX) {
      this.#minX = originX; this.#maxX = targetX;
    } else {
      this.#minX = targetX; this.#maxX = originX;
    }

    if (originY < targetY) {
      this.#minY = originY; this.#maxY = targetY;
    } else {
      this.#minY = targetY; this.#maxY = originY;
    }
  }

  #findObjectsThatAreInsideAndOutsideRect() {
    const insideRect: Selectable[] = [];
    const outsideRect: Selectable[] = [];

    selectables
      .filter(x => x.isSelectable())
      .filter(x => {          // If we don't allow stacking, then filter out all objects that are occupied
        if (!this.#allowStack) return !x.isOccupied();
        else return true;
      })
      .forEach(x => {
        if (this.#inBounds(x)) {
          insideRect.push(x);
        }
        else outsideRect.push(x);
        
      });

    this.#insideRect = insideRect;
    this.#outsideRect = outsideRect;
    this.#validCount = insideRect.length;
  }

  #addRectSelectionEffect(isValid: boolean) {
    // Reset the colors of everything only if there is a change in validity
    if (isValid != this.isSelectionValid) this.#insideRect.forEach(x => x.unhover());
    this.isSelectionValid = isValid;
    
    this.#insideRect.forEach(x => x.hover(!isValid));
    this.#outsideRect.forEach(x => x.unhover());
  }

  #inBounds(obj: Selectable) {
    const coord = obj.getCoordinates();
    return coord.x >= this.#minX && coord.x <= this.#maxX && coord.y >= this.#minY && coord.y <= this.#maxY;
  }

}












/** FixedRectangleSelector is a basic selector that allows the
 * user to select one or more items in a rectangle of fixed size.
 * The size cannot be changed by the user. Use this if you just
 * want to select a single item.
  */

export class FixedRectangleSelector implements SinglePhaseSelector {
  
  isSelectionValid = true;

  #minX = Number.MAX_SAFE_INTEGER; 
  #maxX = Number.MIN_SAFE_INTEGER; 
  #minY = Number.MAX_SAFE_INTEGER;
  #maxY = Number.MIN_SAFE_INTEGER;
  #insideRect: Selectable[] = [];
  #outsideRect: Selectable[] = [];

  #lengthX = 1;
  #lengthY = 1;
  #totalCount;
  #allowStack;
  
  constructor(allowStack: boolean, length: number, width: number) {
    this.#lengthX = length;
    this.#lengthY = width;
    this.#totalCount = this.#lengthX * this.#lengthY;
    this.#allowStack = allowStack == undefined ? false : allowStack;
  }

  getAllowStack() {return this.#allowStack;}

  setAllowStack(val: boolean) {this.#allowStack = val;}

  setMaxRectangleSize(length: number, width: number) {
    this.#lengthX = length;
    this.#lengthY = width;
    this.#totalCount = this.#lengthX * this.#lengthY;
  }

  handleMouseOverValidTarget(target: Selectable) {}

  handleMouseOverAnyTarget(target: Selectable) {

    this.#setMinMaxCoordinates(target);
    this.#findObjectsThatAreInsideAndOutsideRect();

    const selectionContainsUnselectables = this.#insideRect.length < this.#totalCount;

    const occupiedCells = this.#insideRect.filter(x => x.isOccupied());
    let selectionInvalidBecauseOccupied;

    selectionInvalidBecauseOccupied = occupiedCells.length > 0;

    // If all the cells are occupied and we allow stacking, we still
    // have to check if all cells are occupied by the same building
    // before we allow a stack.
    if (this.#allowStack && occupiedCells.length === this.#totalCount) {
      const buildingId = occupiedCells[0].getBuildables()[0].id;
      selectionInvalidBecauseOccupied = 
        occupiedCells.filter(x => x.getBuildables()[0].id === buildingId).length != this.#totalCount;
    }

    if (selectionContainsUnselectables || selectionInvalidBecauseOccupied) {
      this.#addRectSelectionEffect(false);
    } else {
      this.#addRectSelectionEffect(true);
    }

  }

  handleMouseLeaveBoard(target: Selectable) {

    selectables.forEach(x => x.unselectAndUnhover());

  }

  handleMouseLeaveTarget(target: Selectable) {}

  handleSelectionFinished(target: Selectable): FinishSelectionObject {

    const selection: Selectable[] = [];

    selectables
      .filter(x => x.isSelectedOrHovered())
      .forEach(x => selection.push(x));

    return {
      objects: selection,
      target: target,
      data: {
        minX: this.#minX,
        maxX: this.#maxX,
        minY: this.#minY,
        maxY: this.#maxY,
        lengthX: this.#lengthX,
        lengthY: this.#lengthY,
        totalArea: this.#totalCount,
        validCount: this.#totalCount,
      }
    };
  }

  #setMinMaxCoordinates(target: Selectable) {

    /* If we use different cubes, we may have to update the coordinates */
    const targetX = target.getCoordinates().x, targetY = target.getCoordinates().y;

    const offsetX = Math.floor((this.#lengthX) / 2);
    const offsetY = Math.floor((this.#lengthY - 1) / 2);

    this.#minX = targetX - offsetX;
    this.#maxX = targetX + (this.#lengthX - offsetX - 1); 
    this.#minY = targetY - offsetY;
    this.#maxY = targetY + (this.#lengthY - offsetY - 1);

  }

  #findObjectsThatAreInsideAndOutsideRect() {
    const insideRect: Selectable[] = [];
    const outsideRect: Selectable[] = [];

    selectables
      .filter(x => x.isSelectable())
      .forEach(x => {
        if (this.#inBounds(x)) insideRect.push(x);
        else outsideRect.push(x);
      });

    this.#insideRect = insideRect;
    this.#outsideRect = outsideRect;
  }

  #addRectSelectionEffect(isValid: boolean) {
    // Reset the colors of everything if there is a change in validity
    if (isValid != this.isSelectionValid) this.#insideRect.forEach(x => x.unhover());
    this.isSelectionValid = isValid;
    
    this.#insideRect.forEach(x => x.hover(!isValid));
    this.#outsideRect.forEach(x => x.unhover());
  }

  #inBounds(obj: Selectable) {
    const coord = obj.getCoordinates();
    return coord.x >= this.#minX && coord.x <= this.#maxX && coord.y >= this.#minY && coord.y <= this.#maxY;
  }

}