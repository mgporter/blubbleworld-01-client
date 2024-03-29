import CanvasInterface from "../systems/CanvasInterface";
import { Selectable } from "../types";
import { Tooltip, TooltipProps } from "./ToolTip";

const greenTooltip: TooltipProps = {
  message: "",
  textColor: "rgb(255, 255, 255)",
  bgColor: "rgba(5, 46, 22, 0.6)",
  borderColor: "rgb(21, 128, 61)",
  duration: 2,
  pulse: true,
  enableClose: true,
}

const redTooltip: TooltipProps = {
  message: "",
  textColor: "rgb(255, 255, 255)",
  bgColor: "rgba(84, 27, 11, 0.6)",
  borderColor: "rgb(194, 65, 12)",
  duration: 2,
  pulse: true,
  enableClose: true,
}

type ToolTipColors = "red" | "green";


class ToolTipController {
  
  static PADDING = 50;
  static TOOLTIPOFFSETHEIGHT = 150;

  #container;
  #canvasInterface;
  #activeTooltips: Tooltip[];

  #_resizeCanvas;
  #_draw;
  #_removeAllToolTips;


  constructor(container: HTMLDivElement, canvasInterface: CanvasInterface) {
    this.#container = container;
    this.#canvasInterface = canvasInterface;
    this.#activeTooltips = [];

    this.#_resizeCanvas = this.#resizeCanvas.bind(this);
    this.#_draw = this.#draw.bind(this);
    this.#_removeAllToolTips = () => this.removeAllToolTips(true);

    window.addEventListener('resize', this.#_resizeCanvas);
    window.addEventListener('cameraUpdate', this.#_draw);
    window.addEventListener('createWorld', this.#_removeAllToolTips);

    this.#resizeCanvas();
  }

  createTooltip(
    target: Selectable, 
    message: string, 
    color: ToolTipColors, 
    duration: number = 2, 
    pulse: boolean = true,
  ) {

    let props: TooltipProps;

    switch (color) {
      case "green": props = greenTooltip; break;
      case "red": props = redTooltip; break;
    }

    props.message = message;
    props.duration = duration;
    props.pulse = pulse;

    const tooltip = new Tooltip(target, props);

    this.#container.appendChild(tooltip.getDomElement());
    this.#activeTooltips.push(tooltip);

    if (props.duration && props.duration > 0) {
      setTimeout(() => {
        this.removeTooltip(tooltip);
      }, props.duration * 1000);
    }

    if (props.enableClose) {
      tooltip.getDomElement().addEventListener('click', () => {
        this.removeTooltip(tooltip, true);
      }, {once: true});
    }

    this.#updateTooltipValues();
    this.#draw();

    return tooltip;

  }

  #updateTooltipValues() {
    this.#activeTooltips.forEach(x => x.updateValues());
  }

  removeTooltip(tooltip: Tooltip, removeInstantly = false) {
    tooltip.remove(() => {
      const index = this.#activeTooltips.indexOf(tooltip);
      if (index != -1) {
        this.#activeTooltips.splice(index, 1);
      }
    }, removeInstantly);
  }

  removeAllToolTips(removeInstantly?: boolean) {
    this.#activeTooltips.forEach(x => this.removeTooltip(x, removeInstantly));
  }

  #draw() {

    for (const tooltip of this.#activeTooltips) {
      tooltip.draw(
        this.#canvasInterface.getMouseCoordinatesOfSelectable(tooltip.getTarget()),
      );
    }    

  }


  #resizeCanvas() {
    this.#updateTooltipValues();
    this.#draw();
  }

  dispose() {
    window.removeEventListener('resize', this.#_resizeCanvas);
    window.removeEventListener('cameraChange', this.#_draw);
    window.removeEventListener('createWorld', this.#_removeAllToolTips);
  }

}


export { ToolTipController };