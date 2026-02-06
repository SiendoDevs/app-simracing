"use client"

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

export default function SolidKartModal() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading")

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      console.log("SolidKart viewer: container not ready")
      return
    }

    const scene = new THREE.Scene()
    // scene.background removed for transparency

    let width = container.clientWidth
    let height = container.clientHeight

    if (!width || !height) {
      const rect = container.getBoundingClientRect()
      width = rect.width || 640
      height = rect.height || 360
    }

    console.log("SolidKartModal container size", width, height)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(0, 0.4, 2.2)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    // Cyberpunk "Smog" & Lighting
    scene.fog = new THREE.FogExp2(0x202020, 0.05) // Lighter, thicker smoke effect

    const ambient = new THREE.AmbientLight(0x220044, 2.2)
    scene.add(ambient)

    // Dynamic Disco Lights (Blue, Violet, White - No Orange)
    const lights = [
      new THREE.PointLight(0x2979ff, 0, 20), // Blue
      new THREE.PointLight(0xd500f9, 0, 20), // Violet
      new THREE.PointLight(0xffffff, 0, 20), // White
      new THREE.PointLight(0x2979ff, 0, 20), // Blue (Repeat for balance)
    ]
    lights.forEach((l) => scene.add(l))

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = true
    controls.enableZoom = true
    // Create a pivot group for rotation
    const pivot = new THREE.Group()
    pivot.position.y = -0.1 // Move slightly down
    pivot.position.z = -20 // Start far back for entrance
    pivot.rotation.z = Math.PI * 2 // Start with a barrel roll
    scene.add(pivot)

    const loader = new GLTFLoader()
    let model: THREE.Object3D | null = null
    const iridescentMeshes: THREE.Mesh[] = []
    const hotspots: {
      mesh: THREE.Mesh
      localPos: THREE.Vector3
      element: HTMLDivElement
      labelElement: HTMLDivElement | null
      active: boolean
      visible: boolean
    }[] = []
    const pointer = new THREE.Vector2()

    // Hotspots configuration
    const partInfos: Record<string, { title: string; desc: string }> = {
      engine: { title: "Motor Niwa 390cc", desc: "Potencia 4T" },
      llanta: { title: "Neumáticos IBF", desc: "Compuesto blando de alto grip" },
      gomamg: { title: "Neumáticos MG", desc: "Compuesto blando de alto grip" },
      volante: { title: "Volante Solid", desc: "Alcántara con telemetría" },
      chasis: { title: "Chasis Tubular", desc: "Acero al cromo-molibdeno" },
      metal: { title: "Bastidor Solid", desc: "Aleación ligera reforzada" },
      butaca: { title: "Butaca", desc: "Fibra de carbono ultraligera" },
      freno: { title: "Frenos", desc: "Sistema hidráulico ventilado" },
      escape: { title: "Escape", desc: "Cámara de expansión optimizada" },
      cadena: { title: "Transmisión", desc: "Cadena de alta resistencia" },
    }

    loader.load(
      "/assets/SOLID.glb",
      (gltf: GLTF) => {
        model = gltf.scene
        model.rotation.set(0, 0, 0)
        pivot.add(model)

        const patterns = ["llanta", "gomamg", "motor", "metal", "plastico", "plastic", "gold", "cadena", "butaca"]
        const candidates: Record<string, THREE.Mesh[]> = {}

        model.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return
          const mesh = child as THREE.Mesh
          const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined

          const materialName =
            Array.isArray(material) && material.length > 0
              ? material[0]?.name ?? ""
              : (material as THREE.MeshStandardMaterial | undefined)?.name ?? ""

          const baseName = (mesh.name || materialName).toLowerCase()
          if (!baseName) return

          // Iridescent effect logic
          if (patterns.some((p) => baseName.includes(p))) {
            iridescentMeshes.push(mesh)
            if (Array.isArray(material)) {
              material.forEach((m) => {
                m.metalness = 0.9
                m.roughness = 0.15
              })
            } else if (material) {
              material.metalness = 0.9
              material.roughness = 0.15
            }
          }

          // Hotspot candidates logic
          const infoKey = Object.keys(partInfos).find((k) => baseName.includes(k))
          if (infoKey) {
            if (!candidates[infoKey]) candidates[infoKey] = []
            candidates[infoKey].push(mesh)
          }
        })

        const availableKeys = Object.keys(candidates)
        const selectedKeys: string[] = []

        const priorityKeys = ["motor", "niwa", "engine"]
        priorityKeys.forEach((key) => {
          const idx = availableKeys.indexOf(key)
          if (idx !== -1 && selectedKeys.length < 8) {
            selectedKeys.push(key)
            availableKeys.splice(idx, 1)
          }
        })

        while (selectedKeys.length < 8 && availableKeys.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableKeys.length)
          selectedKeys.push(availableKeys[randomIndex])
          availableKeys.splice(randomIndex, 1)
        }

        if (labelsRef.current) {
          labelsRef.current.innerHTML = ""
          
          selectedKeys.forEach((key) => {
            const meshes = candidates[key]
            // Pick a random mesh for this part type
            const mesh = meshes[Math.floor(Math.random() * meshes.length)]
            const info = partInfos[key]

            // Create DOM element
            const el = document.createElement("div")
            el.className = "absolute transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
            el.innerHTML = `
              <div class="flex flex-col items-center">
                <div class="w-2 h-2 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)] mb-1 animate-pulse"></div>
                <div class="bg-black/60 backdrop-blur-md border border-white/20 p-2 rounded-lg text-center max-w-[180px] translate-y-2 transition-all duration-200 hotspot-label opacity-0">
                  <h3 class="text-[10px] font-extrabold uppercase tracking-wider mb-0.5 text-[#ff6f00]">${info.title}</h3>
                  <p class="text-[9px] text-gray-300 leading-tight">${info.desc}</p>
                </div>
              </div>
            `
            el.style.opacity = "0.9"
            labelsRef.current?.appendChild(el)

            const label = el.querySelector<HTMLDivElement>(".hotspot-label")

            // Calculate local center
            mesh.geometry.computeBoundingBox()
            const localPos = new THREE.Vector3()
            if (mesh.geometry.boundingBox) {
              mesh.geometry.boundingBox.getCenter(localPos)
            }

            hotspots.push({ mesh, localPos, element: el, labelElement: label, active: false, visible: false })
          })
        }

        setStatus("ok")
      },
      undefined,
      (error: unknown) => {
        console.error("Error cargando SOLID.glb", error)
        setStatus("error")
      }
    )

    let frameId: number
    let hotspotsRevealStart: number | null = null

    const handlePointerMove = (event: MouseEvent) => {
      if (!container || hotspots.length === 0) return

      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      const tempV = new THREE.Vector3()
      const threshold = 0.18

      hotspots.forEach((h) => {
        h.active = false

        tempV.copy(h.localPos).applyMatrix4(h.mesh.matrixWorld)
        tempV.project(camera)

        const dx = pointer.x - tempV.x
        const dy = pointer.y - tempV.y
        const distSq = dx * dx + dy * dy

        if (distSq < threshold * threshold) {
          h.active = true
        }
      })
    }

    renderer.domElement.addEventListener("mousemove", handlePointerMove)
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      
      const time = Date.now() * 0.001 // seconds
      const targetZ = 0.3

      // Epic Entrance Animation
      // Lerp position Z from -20 to targetZ (más cerca de cámara)
      pivot.position.z += (targetZ - pivot.position.z) * 0.03
      // Lerp rotation Z from PI*2 to 0 (Barrel roll)
      pivot.rotation.z += (0 - pivot.rotation.z) * 0.03

      // Rotate the pivot instead of the model directly
      // Spin faster during entrance
      const isEntering = Math.abs(pivot.position.z) > 0.5
      pivot.rotation.y += isEntering ? 0.05 : 0.005

      if (hotspots.length > 0) {
        const revealInterval = 0.3

        if (isEntering) {
          hotspotsRevealStart = null
          hotspots.forEach((h) => {
            h.visible = false
          })
        } else {
          if (hotspotsRevealStart === null) {
            hotspotsRevealStart = time
          }
          const elapsed = time - hotspotsRevealStart
          const visibleCount = Math.floor(elapsed / revealInterval) + 1

          hotspots.forEach((h, idx) => {
            h.visible = idx < visibleCount
          })
        }
      }

      // Smoothly tilt the model into position AFTER the barrel roll stabilizes
      if (model) {
        model.rotation.x += (0 - model.rotation.x) * 0.015
        model.rotation.z += (0 - model.rotation.z) * 0.015
      }

      // Update hotspots positions
      if (hotspots.length > 0) {
        const tempV = new THREE.Vector3()
        hotspots.forEach((h) => {
          // Get world position
          tempV.copy(h.localPos).applyMatrix4(h.mesh.matrixWorld)
          
          // Project to screen
          tempV.project(camera)

          const onScreen = tempV.z < 1 && tempV.z > -1

          if (onScreen && h.visible) {
            const x = (tempV.x * 0.5 + 0.5) * width
            const y = (-(tempV.y * 0.5) + 0.5) * height
            h.element.style.transform = `translate(${x}px, ${y}px)`
            h.element.style.opacity = "0.9"
            if (h.labelElement) {
              h.labelElement.style.opacity = h.active ? "1" : "0"
            }
          } else {
            h.element.style.opacity = "0"
            if (h.labelElement) {
              h.labelElement.style.opacity = "0"
            }
          }
        })
      }

      iridescentMeshes.forEach((mesh, idx) => {
        const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined
        const hue = (time * 0.15 + idx * 0.2) % 1
        const sat = 0.85
        const lightness = 0.5

        if (Array.isArray(material)) {
          material.forEach((m) => {
            m.color.setHSL(hue, sat, lightness)
          })
        } else if (material) {
          material.color.setHSL(hue, sat, lightness)
        }
      })

      // Animate Disco Lights: Orbiting and Strobing (Chill Mode)
      lights.forEach((light, i) => {
        const offset = i * (Math.PI / 2)
        const speed = 0.3 + i * 0.1 // Slower orbit

        // Orbit logic: Lights move around the kart from different angles
        light.position.x = Math.sin(time * speed + offset) * 4
        light.position.y = Math.sin(time * speed * 0.5) * 2 + 2 // Up and down movement
        light.position.z = Math.cos(time * speed + offset) * 4

        const pulse = Math.sin(time * (0.8 + i * 0.2) + offset)
        light.intensity = (2.5 + Math.max(0, pulse) * 10) * 1.3
      })

      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("resize", handleResize)
      renderer.domElement.removeEventListener("mousemove", handlePointerMove)
      controls.dispose()
      if (model) {
        pivot.remove(model)
      }
      scene.remove(pivot)
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (labelsRef.current) {
        labelsRef.current.innerHTML = ""
      }
    }
  }, [])

  return (
    <div className="w-full relative">
      <div ref={containerRef} className="h-[360px] rounded-xl relative overflow-hidden" />
      <div ref={labelsRef} className="absolute inset-0 pointer-events-none overflow-hidden" />
    </div>
  )
}
