import { Canvas } from '@react-three/fiber';
import { Raycaster, WebGLRenderer } from 'three';
import { MyScene } from '../objects/MyScene';
import { MyPerspectiveCamera } from '../objects/MyPerspectiveCamera';
import { World } from '../World';
import CanvasInterface from '../systems/CanvasInterface';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Resizer } from '../systems/Resizer';

// const scene = new MyScene();
// const camera = new MyPerspectiveCamera(35, 1, 0.1, 100);
// const raycaster = new Raycaster();
// const createRenderer = (canvas: HTMLCanvasElement | OffscreenCanvas) => {
//   const renderer = new WebGLRenderer({
//     canvas: canvas, 
//     antialias: true,
//     alpha: true,
//     powerPreference: "default",
//   })
//   return renderer;
// }

// const renderer = new WebGLRenderer();

export default function CanvasContainer({canvasInterface}: {canvasInterface: CanvasInterface}) {

  const canvasContainerRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {

    const canvasContainer = canvasContainerRef.current;
    canvasContainer.append(canvasInterface.canvas);

    const resizer = new Resizer(
      canvasContainerRef.current,
      canvasInterface.camera,
      canvasInterface.renderer);

    resizer.onResize = () => {
      canvasInterface.render();
    }

    return () => {
      canvasContainer.innerHTML = "";
    }
  }, [canvasInterface]);

  return (
    <div ref={canvasContainerRef} id="canvas-container" className="w-full h-svh z-0 absolute">

    </div>
  )
}