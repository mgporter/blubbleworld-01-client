import { BufferGeometry, Color, Material, Mesh, Object3D, Vector3 } from "three";
import { Buildable } from "../Buildables";

class SelectableMesh extends Mesh {

  #isSelectable = true;
  #isHoverable = true;
  #isSelected = false;
  #isHovered = false;
  #coordinates;
  displayName = "SelectableMesh";

  defaultColor = new Color(0xffffff);
  selectedColor = new Color(0x999999);
  hoverColor = new Color(0x444444);
  rejectedColor = new Color(0xff0000);

  #buildables: Object3D[] = [];
  canPlaceBuildable;

  constructor(geometry: BufferGeometry, material: Material, coordinates?: Vector3, selectable?: boolean) {
    super(geometry, material);
    // this.#isSelectable = selectable == undefined ? true : selectable;
    this.canPlaceBuildable = this.#isSelectable
    this.#coordinates = coordinates ? coordinates : new Vector3();
  }

  getMesh() {
    return this;
  }

  getIndex() {
    return 0;
  }

  getCoordinates() {
    return this.#coordinates;
  }

  isSelectable() {
    return this.#isSelectable;
  }

  setSelectable(val: boolean) {
    this.#isSelectable = val;
    if (!val) this.unselectAndUnhover();
  }

  isHoverable() {
    return this.#isHoverable;
  }

  // CHANGE LATER
  setHoverable(val: boolean) {
    this.#isHoverable = val;
    if (!val) this.unselectAndUnhover();
  }

  isSelected() {
    return this.#isSelected;
  }

  isHovered() {
    return this.#isHovered;
  }

  isSelectedOrHovered() {
    return this.#isSelected || this.#isHovered;
  }

  /* States are (from least to greatest weight):
    1. Default
    2. Hovered
    3. Selected   
  */

  select() {
    if (!this.#isSelectable || this.#isSelected) return;
    this.#isSelected = true;
    this.changeToSelectedAppearance();
  }

  /** 
   * For unselect:
      hovered but not selected -> do nothing
      hovered and selected -> hover
      not hovered but selected -> default 
    */
  unselect() {
    if (!this.#isSelected) return;
    this.#isSelected = false;
    if (!this.#isHovered) {
      this.changeToDefaultAppearance();
    } else {
      this.changeToHoverAppearance();
    }
  }

  hover(rejected?: boolean) {
    if (!this.#isSelectable || this.#isHovered) return;
    this.#isHovered = true;
    rejected === true ?
      this.changeToRejectedAppearance() :  
      this.changeToHoverAppearance();
  }

  /** 
   * For unhover:
      hovered but not selected -> default
      hovered and selected -> do nothing
      not hovered but selected -> do nothing
  */
  unhover() {
    if (!this.#isHovered) return;
    this.#isHovered = false;
    if (!this.#isSelected) {
      this.changeToDefaultAppearance();
    }
  }

  unselectAndUnhover() {
    this.#isSelected = false;
    this.#isHovered = false;
    this.changeToDefaultAppearance();
  }

  addBuildable(mesh: Object3D, building: Buildable, addToObject = true) {
    if (addToObject) {
      mesh.position.x += this.getCoordinates().x;
      mesh.position.y += this.getCoordinates().y;
      mesh.position.z += this.getCoordinates().z;
      this.add(mesh);
    }
    this.#buildables.push(mesh);
  }

  getBuildables() {
    return this.#buildables;
  }

  isOccupied() {
    return this.#buildables.length > 0;
  }

  // Hooks to be overridden by the superclass
  changeToDefaultAppearance() {}
  changeToHoverAppearance() {}
  changeToSelectedAppearance() {}
  changeToRejectedAppearance() {}

}

export { SelectableMesh };