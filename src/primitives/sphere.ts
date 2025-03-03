import { Color } from "../types";
import {
  gl,
  u_FragColor,
  program,
  u_ModelMatrix,
  u_whichTexture,
  uTexture0,
  uTexture1,
  u_enableSpecular,
} from "../asg4";
import { drawTriangles3dUvNormal } from "./triangle";
import { Matrix4 } from "../lib/cuon-matrix-cse160";

export class Sphere {
  type: "sphere";
  color: Color;
  textureNum: number;
  enableSpecular: boolean;

  matrix: Matrix4;
  vertexBuffer: WebGLBuffer | null;
  vertices: Float32Array | null;

  UVBuffer: WebGLBuffer | null;
  UV: Float32Array | null;

  normalBuffer: WebGLBuffer | null;
  normals: Float32Array | null;

  texture0: WebGLTexture | null;
  texture1: WebGLTexture | null;

  constructor() {
    this.type = "sphere";
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();

    this.vertexBuffer = null;
    this.vertices = null;

    this.UVBuffer = null;
    this.UV = null;

    this.normalBuffer = null;
    this.normals = null;

    this.textureNum = -2;
    this.enableSpecular = true;

    this.texture0 = null;
    this.texture1 = null;
  }

  generateVertices() {
    let tempVertices = [];
    let tempUV = [];
    let tempNormals = [];

    // generate sphere
    var d = Math.PI / 25;
    var dd = Math.PI / 25;

    for (var t = 0; t < Math.PI; t += d) {
      for (var r = 0; r < 2 * Math.PI; r += d) {
        var p1 = [
          Math.sin(t) * Math.cos(r),
          Math.sin(t) * Math.sin(r),
          Math.cos(t),
        ];
        var p2 = [
          Math.sin(t + dd) * Math.cos(r),
          Math.sin(t + dd) * Math.sin(r),
          Math.cos(t + dd),
        ];
        var p3 = [
          Math.sin(t) * Math.cos(r + dd),
          Math.sin(t) * Math.sin(r + dd),
          Math.cos(t),
        ];
        var p4 = [
          Math.sin(t + dd) * Math.cos(r + dd),
          Math.sin(t + dd) * Math.sin(r + dd),
          Math.cos(t + dd),
        ];

        // Invert Z direction since it seems there was an issue with it
        var n1 = [p1[0], p1[1], p1[2]];
        var n2 = [p2[0], p2[1], p2[2]];
        var n3 = [p3[0], p3[1], p3[2]];
        var n4 = [p4[0], p4[1], p4[2]];

        var uv1 = [t / Math.PI, r / (2 * Math.PI)];
        var uv2 = [(t + dd) / Math.PI, r / (2 * Math.PI)];
        var uv3 = [t / Math.PI, (r + dd) / (2 * Math.PI)];
        var uv4 = [(t + dd) / Math.PI, (r + dd) / (2 * Math.PI)];

        var v: number[] = [];
        var uv: number[] = [];
        var n: number[] = [];

        // First triangle
        v = v.concat(p1);
        uv = uv.concat(uv1);
        n = n.concat(n1);
        v = v.concat(p2);
        uv = uv.concat(uv2);
        n = n.concat(n2);
        v = v.concat(p4);
        uv = uv.concat(uv4);
        n = n.concat(n4);

        tempVertices.push(...v);
        tempUV.push(...uv);
        tempNormals.push(...n);

        // Reset arrays for second triangle
        v = [];
        uv = [];
        n = [];

        // Second triangle
        v = v.concat(p1);
        uv = uv.concat(uv1);
        n = n.concat(n1);
        v = v.concat(p4);
        uv = uv.concat(uv4);
        n = n.concat(n4);
        v = v.concat(p3);
        uv = uv.concat(uv3);
        n = n.concat(n3);

        tempVertices.push(...v);
        tempUV.push(...uv);
        tempNormals.push(...n);
      }
    }

    this.vertices = new Float32Array(tempVertices);
    this.UV = new Float32Array(tempUV);
    this.normals = new Float32Array(tempNormals);
  }

  render() {
    // let xy = this.position;
    let rgba = this.color;
    // let size = this.size;

    if (this.vertices === null) {
      // Also generates UV
      this.generateVertices();
    }

    if (this.vertexBuffer === null) {
      this.vertexBuffer = gl.createBuffer();
      if (!this.vertexBuffer) {
        console.log("Failed to create the buffer object.");
        return -1;
      }
    }

    if (this.UVBuffer === null) {
      this.UVBuffer = gl.createBuffer();
      if (!this.UVBuffer) {
        console.log("Failed to create the buffer object.");
        return -1;
      }
    }

    if (this.normalBuffer === null) {
      this.normalBuffer = gl.createBuffer();
      if (!this.normalBuffer) {
        console.log("Failed to create the buffer object.");
        return -1;
      }
    }

    // Bug if not using this
    gl.useProgram(program);

    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniform1i(u_enableSpecular, this.enableSpecular ? 1 : 0);
    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    drawTriangles3dUvNormal(
      this.vertices!,
      this.UV!,
      this.normals!,
      this.vertexBuffer!,
      this.UVBuffer!,
      this.normalBuffer!
    );
  }

  setImage(imagePath: string, index: number) {
    if (index === 0) {
      if (this.texture0 === null) {
        this.texture0 = gl.createTexture();
      }

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

      const img = new Image();

      img.onload = () => {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture0);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );

        // Mipmap
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.uniform1i(uTexture0, 0);
      };

      img.crossOrigin = "anonymous";
      img.src = imagePath;
    } else if (index === 1) {
      if (this.texture1 === null) {
        this.texture1 = gl.createTexture();
      }

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

      const img = new Image();

      img.onload = () => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.texture1);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );

        // Mipmap
        gl.generateMipmap(gl.TEXTURE_2D);

        gl.uniform1i(uTexture1, 1);
      };
      img.crossOrigin = "anonymous";
      img.src = imagePath;
    }
  }
}

export function drawSphere(matrix: Matrix4, rgba: number[]) {
  let sphere = new Sphere();
  sphere.color = [rgba[0], rgba[1], rgba[2], rgba[3]];
  sphere.matrix = matrix;
  sphere.render();
}
