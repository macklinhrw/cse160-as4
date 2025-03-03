import { initShaders } from "./lib/cuon-utils";
import { Matrix4 } from "./lib/cuon-matrix-cse160";
import Camera from "./objects/camera";
import { World } from "./objects/world";
import {
  convertCoordinatesEventToGL,
  sendTextToHTML as sendTextToHtml,
} from "./utils";
import { HtmlUi } from "./ui/ui";
import { FullWidthContainer } from "./ui/fullWidthContainer";
import { Button } from "./ui/button";
import { PokemonGame } from "./pokemon";

// Vertex shader program
const VSHADER_SOURCE =
  "attribute vec4 a_Position;\n" +
  "attribute vec2 a_UV;\n" +
  "attribute vec3 a_Normal;\n" +
  "uniform mat4 u_ModelMatrix;\n" +
  "uniform mat4 u_ViewMatrix;\n" +
  "uniform mat4 u_ProjectionMatrix;\n" +
  "varying vec2 v_UV;\n" +
  "varying vec3 v_Normal;\n" +
  "varying vec4 v_VertPos;\n" +
  "void main() {\n" +
  "  gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n" +
  "  v_Normal = a_Normal;\n" +
  "  v_UV = a_UV;\n" +
  "  v_VertPos = u_ModelMatrix * a_Position;\n" +
  "}\n";

// Fragment shader program
const FSHADER_SOURCE =
  "precision mediump float;\n" +
  "varying vec2 v_UV;\n" +
  "varying vec3 v_Normal;\n" +
  "varying vec4 v_VertPos;\n" +
  "uniform vec4 u_FragColor;\n" +
  "uniform vec3 u_LightPos;\n" +
  "uniform vec3 u_SpotLightPos;\n" +
  "uniform vec3 u_SpotLightDir;\n" +
  "uniform vec3 u_cameraPos;\n" +
  "uniform sampler2D uTexture0;\n" +
  "uniform sampler2D uTexture1;\n" +
  "uniform int u_whichTexture;\n" +
  "uniform int u_enableSpecular;\n" +
  "uniform int u_lightsOn;\n" +
  "void main() {\n" +
  "  if (u_whichTexture == -3) {\n" +
  "    gl_FragColor = vec4((v_Normal+1.0)/2.0, 1.0);\n" +
  "  } else if (u_whichTexture == -2) {\n" +
  "    gl_FragColor = u_FragColor;\n" +
  "  } else if (u_whichTexture == -1) {\n" +
  "    gl_FragColor = vec4(v_UV, 1.0, 1.0);\n" +
  "  } else if (u_whichTexture == 0) {\n" +
  "    gl_FragColor = texture2D(uTexture0, v_UV);\n" +
  "  } else if (u_whichTexture == 1) {\n" +
  "    gl_FragColor = texture2D(uTexture1, v_UV);\n" +
  "  } else if (u_whichTexture == 2) {\n" +
  "    vec4 color0 = texture2D(uTexture0, v_UV);\n" +
  "    vec4 color1 = texture2D(uTexture1, v_UV);\n" +
  "    gl_FragColor = vec4(mix(color0.rgb, color1.rgb, color1.a), 1.0);\n" +
  "  } else {\n" +
  "    gl_FragColor = vec4(1,.2,.2,1);\n" +
  "  }\n" +
  "\n" +
  "  if (u_lightsOn == 1) {\n" +
  "    vec3 lightVector = u_LightPos-vec3(v_VertPos);\n" +
  "    float r = length(lightVector);\n" +
  "\n" +
  // "   // Red/Green Distance Visualization\n" +
  // "   if (r<1.0) {\n" +
  // "     gl_FragColor= vec4(1,0,0,1);\n" +
  // "   } else if (r<2.0) {\n" +
  // "     gl_FragColor= vec4(0,1,0,1);\n" +
  // "   }\n" +
  "\n" +
  // "  // Light Falloff Visualization 1/r^2\n" +
  // "  gl_FragColor= vec4(vec3(gl_FragColor)/(r*r),1);\n" +
  "\n" +
  "    // N dot L\n" +
  "    vec3 L = normalize(lightVector);\n" +
  "    vec3 N = normalize(v_Normal);\n" +
  "    float nDotL = max(dot(N,L), 0.0);\n" +
  "  \n" +
  "    // Reflection\n" +
  "    vec3 R = reflect(-L, N);\n" +
  "  \n" +
  "    // Eye vector\n" +
  "    vec3 E = normalize(u_cameraPos-vec3(v_VertPos));\n" +
  "  \n" +
  "    // Specular\n" +
  "    float specular = 0.0;\n" +
  "    if (u_enableSpecular == 1) {\n" +
  "      specular = pow(max(dot(E,R), 0.0), 100.0);\n" +
  "    }\n" +
  "  \n" +
  "    // Calculate diffuse and ambient lighting\n" +
  "    vec3 diffuse = vec3(gl_FragColor) * nDotL * 0.7;\n" +
  "    vec3 ambient = vec3(gl_FragColor) * 0.3;\n" +
  "    vec3 result = specular+diffuse+ambient;\n" +
  "\n" +
  "    // Spotlight\n" +
  "    vec3 distance = u_SpotLightPos-vec3(v_VertPos);\n" +
  "    vec3 w = normalize(distance);\n" +
  "    vec3 d = normalize(u_SpotLightDir);\n" +
  "    float angleBetween = dot(-w, d);\n" +
  "    float angle = cos(radians(20.0));\n" +
  "    if (angleBetween > angle) {\n" +
  "      float spotR = length(distance);\n" +
  "      vec3 l = normalize(distance);\n" +
  "      float spotNDotL = max(dot(N, l), 0.0);\n" +
  "      vec3 spotReflection = reflect(-l, N);\n" +
  "      float spotSpecular = 0.0;\n" +
  "      if (u_enableSpecular == 1) {\n" +
  "        spotSpecular = pow(max(dot(E, spotReflection), 0.0), 100.0);\n" +
  "      }\n" +
  "      float intensity = 0.6 * (1.0 / (1.0 + 0.05 * spotR * spotR));\n" +
  "      vec3 spotDiffuse = vec3(gl_FragColor) * spotNDotL * intensity;\n" +
  "      result += spotDiffuse + vec3(spotSpecular);\n" +
  "    }\n" +
  "    gl_FragColor = vec4(result, 1.0);\n" +
  "  }\n" +
  "}\n";

// Globals
export let canvas: HTMLCanvasElement;
export let gl: WebGLRenderingContext;
export let a_Position: number;
export let a_UV: number;
export let a_Normal: number;
export let u_FragColor: WebGLUniformLocation;
export let u_Size: WebGLUniformLocation;
export let u_ModelMatrix: WebGLUniformLocation;
export let u_ProjectionMatrix: WebGLUniformLocation;
export let u_ViewMatrix: WebGLUniformLocation;
export let u_LightPos: WebGLUniformLocation;
export let u_cameraPos: WebGLUniformLocation;
export let uTexture0: WebGLUniformLocation;
export let uTexture1: WebGLUniformLocation;
export let u_whichTexture: WebGLUniformLocation;
export let u_enableSpecular: WebGLUniformLocation;
export let u_lightsOn: WebGLUniformLocation;
export let u_SpotLightPos: WebGLUniformLocation;
export let u_SpotLightDir: WebGLUniformLocation;
export let program: WebGLProgram;

// Globals for drawing UI
export let g_joint1Angle = 0;
export let g_joint2Angle = 0;
export let g_joint3Angle = 0;
export let g_normalOn = false;
export let g_lightsOn = true;

// animations
export let g_joint1AnimationRunning = false;
export let g_joint2AnimationRunning = false;
export let g_joint3AnimationRunning = false;
export let g_neckAngle = 55;
export let g_neckAnimating = false;

export let g_mouseRotX = 0;
export let g_mouseRotY = 0;

export let g_lightPos = [0, 6, 0];
export let g_spotLightPos = [0, 4, 0];
export let g_spotLightDir = [0, -1, 0];

export let g_camera: Camera;
export let g_world: World;
export let g_ui_1: HtmlUi;
export let g_ui_2: HtmlUi;

export let g_pokemonGame: PokemonGame;

function setupWebGL() {
  // Retrieve <canvas> element
  let canvasTmp = document.getElementById("webgl") as HTMLCanvasElement | null;
  if (!canvasTmp) {
    console.log("Failed to get the canvas.");
    return;
  }
  canvas = canvasTmp;

  // Get the rendering context for WebGL
  let glTmp = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!glTmp) {
    console.log("Failed to get the rendering context for WebGL");
    return;
  }
  gl = glTmp;

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL() {
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log("Failed to intialize shaders.");
    return;
  }
  program = gl.program;

  // Get the storage location of a_Position
  let a_PositionTmp = gl.getAttribLocation(gl.program, "a_Position");
  if (a_PositionTmp < 0) {
    console.log("Failed to get the storage location of a_Position");
    return;
  }
  a_Position = a_PositionTmp;

  // Get the storage location of a_UV
  let a_UVTmp = gl.getAttribLocation(gl.program, "a_UV");
  if (a_UVTmp < 0) {
    console.log("Failed to get the storage location of a_UV");
    return;
  }
  a_UV = a_UVTmp;

  // Get the storage location of a_Normal
  let a_NormalTmp = gl.getAttribLocation(gl.program, "a_Normal");
  if (a_NormalTmp < 0) {
    console.log("Failed to get the storage location of a_Normal");
    return;
  }
  a_Normal = a_NormalTmp;

  // Get the storage location of u_FragColor
  let u_FragColorTmp = gl.getUniformLocation(gl.program, "u_FragColor");
  if (!u_FragColorTmp) {
    console.log("Failed to get the storage location of u_FragColor");
    return;
  }
  u_FragColor = u_FragColorTmp;

  let u_ModelMatrixTmp = gl.getUniformLocation(gl.program, "u_ModelMatrix");
  if (!u_ModelMatrixTmp) {
    console.log("Failed to get the storage location of u_ModelMatrix");
    return;
  }
  u_ModelMatrix = u_ModelMatrixTmp;

  // Set initial value for matrix
  let identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

  // Update texture uniform locations
  let uTexture0Tmp = gl.getUniformLocation(gl.program, "uTexture0");
  if (!uTexture0Tmp) {
    console.log("Failed to get the storage location of uTexture0");
    return;
  }
  uTexture0 = uTexture0Tmp;

  let uTexture1Tmp = gl.getUniformLocation(gl.program, "uTexture1");
  if (!uTexture1Tmp) {
    console.log("Failed to get the storage location of uTexture1");
    return;
  }
  uTexture1 = uTexture1Tmp;

  let u_whichTextureTmp = gl.getUniformLocation(gl.program, "u_whichTexture");
  if (!u_whichTextureTmp) {
    console.log("Failed to get the storage location of u_whichTexture");
    return;
  }
  u_whichTexture = u_whichTextureTmp;

  // Get the storage location of u_ViewMatrix
  let u_ViewMatrixTmp = gl.getUniformLocation(gl.program, "u_ViewMatrix");
  if (!u_ViewMatrixTmp) {
    console.log("Failed to get the storage location of u_ViewMatrix");
    return;
  }
  u_ViewMatrix = u_ViewMatrixTmp;

  // Get the storage location of u_ProjectionMatrix
  let u_ProjectionMatrixTmp = gl.getUniformLocation(
    gl.program,
    "u_ProjectionMatrix"
  );
  if (!u_ProjectionMatrixTmp) {
    console.log("Failed to get the storage location of u_ProjectionMatrix");
    return;
  }
  u_ProjectionMatrix = u_ProjectionMatrixTmp;

  // Get the storage location of u_LightPos
  let u_LightPosTmp = gl.getUniformLocation(gl.program, "u_LightPos");
  if (!u_LightPosTmp) {
    console.log("Failed to get the storage location of u_LightPos");
    return;
  }
  u_LightPos = u_LightPosTmp;

  // Get the storage location of u_cameraPos
  let u_cameraPosTmp = gl.getUniformLocation(gl.program, "u_cameraPos");
  if (!u_cameraPosTmp) {
    console.log("Failed to get the storage location of u_cameraPos");
    return;
  }
  u_cameraPos = u_cameraPosTmp;

  // Get the storage location of u_enableSpecular
  let u_enableSpecularTmp = gl.getUniformLocation(
    gl.program,
    "u_enableSpecular"
  );
  if (!u_enableSpecularTmp) {
    console.log("Failed to get the storage location of u_enableSpecular");
    return;
  }
  u_enableSpecular = u_enableSpecularTmp;

  // Get the storage location of u_lightsOn
  let u_lightsOnTmp = gl.getUniformLocation(gl.program, "u_lightsOn");
  if (!u_lightsOnTmp) {
    console.log("Failed to get the storage location of u_lightsOn");
    return;
  }
  u_lightsOn = u_lightsOnTmp;

  // Get the storage location of u_SpotLightPos
  let u_SpotLightPosTmp = gl.getUniformLocation(gl.program, "u_SpotLightPos");
  if (!u_SpotLightPosTmp) {
    console.log("Failed to get the storage location of u_SpotLightPos");
    return;
  }
  u_SpotLightPos = u_SpotLightPosTmp;

  // Get the storage location of u_SpotLightDir
  let u_SpotLightDirTmp = gl.getUniformLocation(gl.program, "u_SpotLightDir");
  if (!u_SpotLightDirTmp) {
    console.log("Failed to get the storage location of u_SpotLightDir");
    return;
  }
  u_SpotLightDir = u_SpotLightDirTmp;
}

function updateLightPosition() {
  g_world.light.matrix.setTranslate(
    g_lightPos[0],
    g_lightPos[1],
    g_lightPos[2]
  );
  g_world.light.matrix.scale(-0.3, -0.3, -0.3);
  g_world.light.matrix.translate(-0.5, -0.5, -0.5);

  gl.uniform3f(u_LightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  g_world.spotlight.matrix.setTranslate(
    g_spotLightPos[0],
    g_spotLightPos[1],
    g_spotLightPos[2]
  );
  g_world.spotlight.matrix.scale(-0.3, -0.3, -0.3);
  g_world.spotlight.matrix.translate(-0.5, -0.5, -0.5);

  gl.uniform3f(
    u_SpotLightPos,
    g_spotLightPos[0],
    g_spotLightPos[1],
    g_spotLightPos[2]
  );

  // Normalize the spotlight direction
  const length = Math.sqrt(
    g_spotLightDir[0] * g_spotLightDir[0] +
      g_spotLightDir[1] * g_spotLightDir[1] +
      g_spotLightDir[2] * g_spotLightDir[2]
  );

  const normalizedDir = [
    g_spotLightDir[0] / length,
    g_spotLightDir[1] / length,
    g_spotLightDir[2] / length,
  ];

  gl.uniform3f(
    u_SpotLightDir,
    normalizedDir[0],
    normalizedDir[1],
    normalizedDir[2]
  );
}

export function addActionsForHtmlUI() {
  let sliderLightX = document.getElementById(
    "slider_light_x"
  ) as HTMLInputElement;
  sliderLightX.addEventListener("input", (event) => {
    g_lightPos[0] = Number((event.target as HTMLInputElement).value);
    updateLightPosition();
    renderScene();
  });

  let sliderLightY = document.getElementById(
    "slider_light_y"
  ) as HTMLInputElement;
  sliderLightY.addEventListener("input", (event) => {
    g_lightPos[1] = Number((event.target as HTMLInputElement).value);
    updateLightPosition();
    renderScene();
  });

  let sliderLightZ = document.getElementById(
    "slider_light_z"
  ) as HTMLInputElement;
  sliderLightZ.addEventListener("input", (event) => {
    g_lightPos[2] = Number((event.target as HTMLInputElement).value);
    updateLightPosition();
    renderScene();
  });

  let sliderSpotlightX = document.getElementById(
    "slider_spotlight_x"
  ) as HTMLInputElement;
  sliderSpotlightX.addEventListener("input", (event) => {
    g_spotLightPos[0] = Number((event.target as HTMLInputElement).value);
    updateLightPosition();
    renderScene();
  });

  let sliderSpotlightY = document.getElementById(
    "slider_spotlight_y"
  ) as HTMLInputElement;
  sliderSpotlightY.addEventListener("input", (event) => {
    g_spotLightPos[1] = Number((event.target as HTMLInputElement).value);
    updateLightPosition();
    renderScene();
  });

  let sliderSpotlightZ = document.getElementById(
    "slider_spotlight_z"
  ) as HTMLInputElement;
  sliderSpotlightZ.addEventListener("input", (event) => {
    g_spotLightPos[2] = Number((event.target as HTMLInputElement).value);
    updateLightPosition();
    renderScene();
  });

  let buttonToggleNormal = document.getElementById(
    "b_toggle_normal"
  ) as HTMLButtonElement;
  buttonToggleNormal.onclick = () => {
    g_normalOn = !g_normalOn;
    sendTextToHtml(g_normalOn ? "On" : "Off", "normal_status");
    renderScene();
  };

  let buttonToggleLights = document.getElementById(
    "b_toggle_lights"
  ) as HTMLButtonElement;
  buttonToggleLights.onclick = () => {
    g_lightsOn = !g_lightsOn;
    sendTextToHtml(g_lightsOn ? "On" : "Off", "lights_status");
    renderScene();
  };
}

function main() {
  // Set up canvas and gl variables
  setupWebGL();
  // Set up shader programs and connect GLSL variables
  connectVariablesToGLSL();
  // Set up actions for HTML UI elements
  addActionsForHtmlUI();

  // Initialize normal status
  sendTextToHtml(g_normalOn ? "On" : "Off", "normal_status");
  sendTextToHtml(g_lightsOn ? "On" : "Off", "lights_status");

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = (ev) => {
    if (ev.buttons == 1) {
      click(ev);
    }
  };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.15, 0.15, 0.7, 1.0);

  // Setup 2d UI
  // setup2dUi();

  // Generate the world
  g_world = new World();
  g_camera = g_world.camera;
  // g_ui_2 = new HtmlUi();
  // g_pokemonGame = new PokemonGame(g_camera, g_ui_2, g_ui_1);

  requestAnimationFrame(tick);
}

function click(ev: MouseEvent) {
  if (ev.shiftKey) {
    g_neckAnimating = !g_neckAnimating;
  } else {
    let [x, y] = convertCoordinatesEventToGL(ev);
    g_mouseRotY = x * 180;
    g_mouseRotX = y * 90;
  }
  renderScene();
}

let g_startTime = performance.now() / 1000;
let g_seconds = performance.now() / 1000 - g_startTime;

function tick() {
  g_seconds = performance.now() / 1000 - g_startTime;
  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  if (g_joint1AnimationRunning) {
    g_joint1Angle = Math.abs(15 * Math.sin(g_seconds));
  }
  if (g_joint2AnimationRunning) {
    g_joint2Angle = Math.abs(10 * Math.sin(g_seconds * 3));
  }
  if (g_joint3AnimationRunning) {
    g_joint3Angle = Math.abs(5 * Math.sin(g_seconds * 3));
  }
  if (g_neckAnimating) {
    g_neckAngle = 55 + 10 * Math.sin(g_seconds * 2);
  }

  g_lightPos[0] = 10 * Math.sin(g_seconds / 4);
  updateLightPosition();
}

function setup3d() {
  gl.enable(gl.DEPTH_TEST);

  // 3D Camera setup
  gl.uniformMatrix4fv(
    u_ProjectionMatrix,
    false,
    g_camera.projectionMatrix.elements
  );
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
}

function setup2dUi() {
  g_ui_1 = new HtmlUi();

  // Create HTML UI
  const uiContainerEl = new FullWidthContainer(100);
  uiContainerEl.setText(
    "Blocky World - Macklin Reeve-Wilson (mreevewi@ucsc.edu)"
  );

  const buttonShowEl = new Button("Show");
  buttonShowEl.setOnClick(() => {
    uiContainerEl.setVisible(true);
    buttonShowEl.setVisible(false);
  });
  buttonShowEl.setSize(50, 28);
  buttonShowEl.setPositionRelativeBottomRight(10, 10);
  buttonShowEl.addStyles("text-sm");
  buttonShowEl.visible = false;

  const buttonPlaceBlock = new Button("Place Block");
  buttonPlaceBlock.setSize(100, 40);
  buttonPlaceBlock.setPositionRelativeBottomLeft(20, 20);
  buttonPlaceBlock.addStyles("text-xs");
  buttonPlaceBlock.setParent(uiContainerEl);
  buttonPlaceBlock.setOnClick(() => {
    g_world.placeBlock(g_world.getNearestBlockPositionFromCamera());
  });

  const buttonRemoveBlock = new Button("Remove Block");
  buttonRemoveBlock.setSize(100, 40);
  buttonRemoveBlock.setPositionRelativeBottomLeft(140, 20);
  buttonRemoveBlock.addStyles("text-xs");
  buttonRemoveBlock.setParent(uiContainerEl);
  buttonRemoveBlock.setOnClick(() => {
    g_world.removeBlock(g_world.getNearestBlockPositionFromCamera());
  });

  const buttonBattle = new Button("Blockmon Battle");
  buttonBattle.setSize(100, 40);
  buttonBattle.setPositionRelativeBottomLeft(280, 20);
  buttonBattle.addStyles("text-xs");
  buttonBattle.setParent(uiContainerEl);
  buttonBattle.setOnClick(() => {
    g_pokemonGame.start();
    g_pokemonGame.shouldStart = true;
  });

  const buttonEl = new Button("Hide");
  buttonEl.setParent(uiContainerEl);
  buttonEl.setOnClick(() => {
    uiContainerEl.setVisible(false);
    buttonShowEl.setVisible(true);
  });
  buttonEl.setSize(60, 32);
  buttonEl.setPositionRelativeBottomRight(20, 20);

  g_ui_1.addElement(uiContainerEl);
  g_ui_1.addElement(buttonEl);
  g_ui_1.addElement(buttonShowEl);

  g_ui_1.render();
}

export function renderScene() {
  const startTime = performance.now();

  setup3d();
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);
  gl.uniform4f(u_FragColor, 1, 1, 1, 1);

  // Update camera position uniform
  gl.uniform3f(
    u_cameraPos,
    g_camera.position.elements[0],
    g_camera.position.elements[1],
    g_camera.position.elements[2]
  );

  // lights on/off
  gl.uniform1i(u_lightsOn, g_lightsOn ? 1 : 0);

  g_world.render();

  const duration = performance.now() - startTime;
  // milliseconds per frame

  // console.log("camera test:", g_camera);

  // Performance display
  sendTextToHtml(
    "ms: " + Math.floor(duration) + " fps: " + Math.floor(1000 / duration),
    "numdot"
  );
}

main();
