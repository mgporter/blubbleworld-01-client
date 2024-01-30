import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react"
import { MyFlyControls } from "./systems/MyFlyControls";
import { WorldBuilder } from "./systems/WorldBuilder";
import { SelectableMesh } from "./objects/SelectableMesh";
import { SelectableInstancedMesh } from "./objects/SelectableInstancedMesh";

let flyControls: MyFlyControls;
let worldBuilder: WorldBuilder;

const cb = (things: SelectableMesh[] | SelectableInstancedMesh[]) => console.log(things);

export function World() {

  const { camera, scene, gl, raycaster } = useThree();

  useEffect(() => {

    worldBuilder = new WorldBuilder(camera, scene, gl.domElement, raycaster);

    flyControls = new MyFlyControls(
      camera, 
      gl.domElement, 
      {length: worldBuilder.zSize, width: worldBuilder.xSize}
    );

    return () => {
      flyControls.dispose();
      worldBuilder.clearWorld();
    }
  }, [camera, scene, gl, raycaster]);

  useFrame((state, delta) => {
    flyControls.update(delta);
  });

  useEffect(() => {

    const rectSelector = worldBuilder.setAndEnableBoardSelector("rectangle", cb);

    return () => {
      worldBuilder.disableSelector(rectSelector);
    }

  }, []);

  return (
    <>
    </>
  )

}