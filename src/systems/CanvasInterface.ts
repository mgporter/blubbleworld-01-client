import { Camera, Matrix4, Object3D, Raycaster, Scene, WebGLRenderer } from "three";
import { Lights } from "../objects/Lights";
import { Board } from "./Board";
import { Animatable, Selectable, Selector } from "../types";
import { MyFlyControls } from "./MyFlyControls";
import { BaseSelector, ConnectingSelector, MouseEventHandler } from "./MouseEventHandlers";
import { SelectableMesh } from "../objects/SelectableMesh";
import { SelectableInstancedMesh } from "../objects/SelectableInstancedMesh";
import { MyScene } from "../objects/MyScene";
import { MyPerspectiveCamera } from "../objects/MyPerspectiveCamera";
import { Buildable, BuildableUserData } from "../Buildables";
import { ModelInterface } from "./ModelInterface";

export default class CanvasInterface {

  // These are set with the onCreated callback in the react-three 
  // Canvas element and should never be null
  #scene: Scene;
  #camera: Camera;
  #raycaster: Raycaster;
  #renderer!: WebGLRenderer;

  // Control objects
  #board: Board | null;
  #flyControls!: MyFlyControls | null;
  #mouseEvents!: MouseEventHandler | null;
  #modelInterface;

  // Collections
  #selectables: (SelectableMesh | SelectableInstancedMesh)[]
  #animatables: Animatable[];

  constructor() {
    this.#scene = new MyScene();
    this.#camera = new MyPerspectiveCamera(35, 1, 0.1, 100);
    this.#raycaster = new Raycaster();

    this.#flyControls = null;
    this.#board = null;
    this.#animatables = [];
    this.#selectables = [];
    this.#mouseEvents = null;

    this.#modelInterface = new ModelInterface();
  }

  get scene() {return this.#scene;}
  get camera() {return this.#camera;}
  get renderer() {return this.#renderer;}
  get raycaster() {return this.#raycaster;}

  setState(scene: Scene, camera: Camera, renderer: WebGLRenderer, raycaster: Raycaster) {
    this.#scene = scene;
    this.#camera = camera;
    this.#renderer = renderer;
    this.#raycaster = raycaster;

    this.init();
  }

  init() {

    /* This cannot be set in the constructor because when the object
    is constructed, we do not have a reference to the renderer */
    this.#flyControls = new MyFlyControls(this.#camera, this.#renderer);

    this.#mouseEvents = new MouseEventHandler(
      this.#camera,
      this.#raycaster,
      this.#renderer,
      this.#selectables,
      );

    this.#modelInterface = new ModelInterface();

  }

  enableFlyControls() {
    if (!this.#flyControls) return;
    this.#flyControls!.enable();
    this.#animatables.push(this.#flyControls!);
  }

  disableFlyControls() {
    if (!this.#flyControls) return;
    this.#flyControls.dispose();
    this.#animatables.splice(this.#animatables.indexOf(this.#flyControls), 1);
  }

  enableMouseHandler() {
    // if (!this.#mouseEvents) return;
    this.#mouseEvents!.enable();
  }

  disableMouseHandler() {
    // if (!this.#mouseEvents) return;
    this.#mouseEvents!.dispose();
  }

  updateAnimatables(delta: number) {
    for (const obj of this.#animatables) {
      obj.update(delta);
    }
  }

  /** Pass in a selector, or "null" to disable */
  setSelector(selector: Selector | null) {
    if (selector) this.#mouseEvents!.setSelector(selector);
    else this.#mouseEvents!.setSelector(new BaseSelector());
  }

  getSelector() {
    // if (!this.#mouseEvents) return;
    return this.#mouseEvents!.getSelector();
  }

  buildWorld(sizeX: number, sizeY: number, pondPercent: number, mountainPercent: number, seed: number | null) {
    const directionalLight = Lights.createDirectionalLight();
    const ambientLight = Lights.createAmbientLight();
    this.#scene.add(directionalLight, ambientLight);
    this.#board = new Board(sizeX, sizeY, pondPercent, mountainPercent, seed);
    this.#board.addBoardToScene(this.#scene);
    this.#selectables = this.#board.getSelectables();

    this.#mouseEvents!.setObjects(this.#selectables);
  }

  placeBuilding(building: Buildable, objects: Selectable[], target: Selectable) {

    /**
     * Current issues:
     * 1. we check for the height of a stackable building by looking at the
     * length of the array of the buildables array in the selectable. However,
     * this array also contains connectors. This would be a problem if we wanted
     * a stackable building with connectors.
     */

    if (MouseEventHandler.isTwoPhaseSelector(building.selector)) {
      objects.forEach(x => {
        const model = this.#modelInterface.getModel(building.keyName);
        x.addBuildable(model, building);
      });
    } 

    else if (MouseEventHandler.isConnectingSelector(building.selector)) {
      const model = this.#modelInterface.getModel(building.keyName);
      target.addBuildable(model, building);
      const adjCells = building.selector.getConnectingObjects(target, objects);

      this.#addConnectorToBoard(building, model, adjCells);
    }
    
    else {
      // Single Phase selector: currently only for Skyscraper
      const model = this.#modelInterface.getModel(building.keyName);

      // get Height info
      const level = target.getBuildables().length;
      model.position.z += level * building.mesh.heightIncrementor;

      objects.forEach(x => {
        if (x === target) x.addBuildable(model, building);
        else x.addBuildable(model, building, false);
      });

    }

    this.#mouseEvents?.updateObjects(objects);

  }

  #addConnectorToBoard(
    building: Buildable, 
    model: Object3D, 
    adjCells: {
      offsetX: number,
      offsetY: number,
      cell: Selectable,
    }[]) {
      
    for (const adjCell of adjCells) {

      const connectorModel = this.#modelInterface.getModel(`${building.keyName}_Connector`);
      connectorModel.position.x += -(adjCell.offsetX * 0.5);
      connectorModel.position.y += 0;
      connectorModel.position.z += adjCell.offsetY * 0.5;

      model.add(connectorModel);

      const targetUserData = (model.userData as BuildableUserData);
      const adjCellUserData = (adjCell.cell.getBuildables()[0].userData as BuildableUserData);

      targetUserData.connectors.push(connectorModel);
      adjCellUserData.connectors.push(connectorModel);
      
    }
  }

  bulldozeMountain(selectables: Selectable[]) {
    selectables.forEach(mountain => {
      const index = mountain.getIndex();
      const instancedMesh = mountain.getMesh() as SelectableInstancedMesh;

      const matrix = new Matrix4();

      instancedMesh.getMatrixAt(index, matrix);
      console.log(matrix);
      const array = matrix.toArray();
      matrix.fromArray([
        array[0], array[1], array[2], array[3],
        array[4], array[5], array[6], array[7],
        array[8], array[9], 1, array[11],
        array[12], array[13], array[14], array[15],
      ]);
      
      instancedMesh.setMatrixAt(index, matrix);
      instancedMesh.instanceMatrix.needsUpdate = true;

      mountain.canPlaceBuildable = true;
    })

    this.#mouseEvents?.updateObjects(selectables);
  }

  demolishBuildings(selectables: Selectable[]) {
    selectables.forEach(x => {
      const model = x.getBuildables()[x.getBuildables().length - 1];
      this.#removeBuilding(model, x);
    })

    this.#mouseEvents?.updateObjects(selectables);
  }

  #removeBuilding(mesh: Object3D, selectable?: Selectable) {
    if ((mesh.userData as BuildableUserData).connectors) {
      (mesh.userData as BuildableUserData).connectors
        .forEach(x => x.parent?.remove(x));
    }
    mesh.parent?.remove(mesh);
    if (selectable) selectable.getBuildables().pop();
  }

  clearWorld() {
    this.#scene.clear();
  }

  disposeAll() {
    if (this.#flyControls) this.#flyControls.dispose();
    if (this.#mouseEvents) this.#mouseEvents.dispose();
  }

}