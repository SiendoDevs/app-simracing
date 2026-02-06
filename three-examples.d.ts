declare module "three/examples/jsm/loaders/DDSLoader" {
  import { CompressedTextureLoader, LoadingManager } from "three"

  export class DDSLoader extends CompressedTextureLoader {
    constructor(manager?: LoadingManager)
  }
}

declare module "three/examples/jsm/loaders/GLTFLoader" {
  import {
    AnimationClip,
    Loader,
    LoadingManager,
    Scene,
  } from "three"

  export interface GLTF {
    scene: Scene
    scenes: Scene[]
    animations: AnimationClip[]
  }

  export class GLTFLoader extends Loader<GLTF> {
    constructor(manager?: LoadingManager)
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void
    ): void
  }
}

declare module "three/examples/jsm/controls/OrbitControls" {
  import {
    Camera,
    EventDispatcher,
  } from "three"

  export class OrbitControls extends EventDispatcher {
    constructor(object: Camera, domElement?: HTMLElement | null)
    update(): void
    dispose(): void
    enableDamping: boolean
    enablePan: boolean
    enableZoom: boolean
  }
}

