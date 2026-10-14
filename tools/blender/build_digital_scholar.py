"""Build a lightweight, stylised 3D digital scholar for the Yinqi platform.

Run with Blender 5.x in background mode:
  blender.exe --background --python tools/blender/build_digital_scholar.py
"""
from __future__ import annotations

import math
import os
import bpy
from mathutils import Vector

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODEL_DIR = os.path.join(ROOT, "public", "character", "digital-scholar", "model")
REFERENCE_PATH = os.path.join(MODEL_DIR, "character-reference.png")
os.makedirs(MODEL_DIR, exist_ok=True)


def mat(name: str, color: tuple[float, float, float, float], metallic=0.0, roughness=0.55):
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    m.use_nodes = True
    nodes = m.node_tree.nodes
    bsdf = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")
        output = next((node for node in nodes if node.type == "OUTPUT_MATERIAL"), None)
        if output is not None:
            m.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return m


ROBE = mat("Robe · 深玄黑", (0.055, 0.075, 0.095, 1), roughness=0.72)
             
INNER = mat("Inner Robe · 米白", (0.72, 0.67, 0.56, 1), roughness=0.68)
SKIN = mat("Skin · 温润肤色", (0.60, 0.32, 0.20, 1), roughness=0.5)
HAIR = mat("Hair · 墨黑", (0.012, 0.009, 0.008, 1), roughness=0.36)
GOLD = mat("Bronze Gold · 暗金", (0.34, 0.18, 0.055, 1), metallic=0.72, roughness=0.34)
BONE = mat("Oracle Bone · 骨牌", (0.68, 0.50, 0.30, 1), roughness=0.6)


def smooth(obj):
    if obj.type == "MESH":
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def uv_sphere(name, loc, scale, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=16, location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    return smooth(o)


def cube(name, loc, scale, material, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new("Soft tailored edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
    return o


def cylinder(name, loc, radius, depth, material, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return smooth(o)


def cone(name, loc, r1, r2, depth, material, vertices=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    o.data.materials.append(material)
    return smooth(o)


def bone(arm, name, head, tail, parent=None):
    b = arm.data.edit_bones.new(name)
    b.head = head
    b.tail = tail
    if parent:
        b.parent = arm.data.edit_bones.get(parent)
    return b


def make_armature():
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = bpy.context.object
    arm.name = "DigitalScholar_Armature"
    arm.data.name = "DigitalScholar_Skeleton"
    arm.data.edit_bones.remove(arm.data.edit_bones[0])
    bone(arm, "Hips", (0, 0, 1.15), (0, 0, 1.55))
    bone(arm, "Spine", (0, 0, 1.55), (0, 0, 2.25), "Hips")
    bone(arm, "Chest", (0, 0, 2.25), (0, 0, 2.85), "Spine")
    bone(arm, "Neck", (0, 0, 2.85), (0, 0, 3.08), "Chest")
    bone(arm, "Head", (0, 0, 3.08), (0, 0, 3.7), "Neck")
    for side in (-1, 1):
        s = "L" if side < 0 else "R"
        bone(arm, f"UpperArm.{s}", (side * .43, 0, 2.7), (side * .9, 0, 2.25), "Chest")
        bone(arm, f"LowerArm.{s}", (side * .9, 0, 2.25), (side * 1.08, -0.02, 1.7), f"UpperArm.{s}")
        bone(arm, f"Hand.{s}", (side * 1.08, -0.02, 1.7), (side * 1.08, -0.02, 1.42), f"LowerArm.{s}")
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return arm


def add_action(arm, name, frames, rotations):
    action = bpy.data.actions.new(name)
    arm.animation_data_create()
    arm.animation_data.action = action
    for bone_name, values in rotations.items():
        pb = arm.pose.bones.get(bone_name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        for frame, rot in zip(frames, values):
            pb.rotation_euler = rot
            pb.keyframe_insert("rotation_euler", frame=frame)
    action.use_fake_user = True
    return action


def build():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass

    model_collection = bpy.data.collections.new("MODEL · 数字史官")
    bpy.context.scene.collection.children.link(model_collection)
    reference_collection = bpy.data.collections.new("REFERENCE · 多视角设定图")
    bpy.context.scene.collection.children.link(reference_collection)

    # Keep the supplied multi-view board inside the .blend for modelling reference,
    # but never export it with the runtime model.
    if os.path.exists(REFERENCE_PATH):
        try:
            image = bpy.data.images.load(REFERENCE_PATH, check_existing=True)
            bpy.ops.object.empty_add(type="IMAGE", location=(3.8, 0.8, 2.4))
            ref = bpy.context.object
            ref.name = "REFERENCE_BOARD · 正侧背与服装细节"
            ref.data = image
            ref.empty_display_type = "IMAGE"
            ref.empty_display_size = 4.2
            ref.color[3] = 0.65
            for col in list(ref.users_collection):
                col.objects.unlink(ref)
            reference_collection.objects.link(ref)
        except Exception as exc:
            print(f"REFERENCE_LOAD_SKIPPED: {exc}")

    # Feet, inner robe and tailored outer robe silhouette.
    cone("InnerRobe", (0, 0, 1.26), 0.58, 0.40, 2.25, INNER)
    cone("OuterRobe", (0, 0.02, 1.72), 1.02, 0.62, 1.95, ROBE)
    cone("ShoulderCape", (0, 0.03, 2.52), 0.92, 0.58, 0.68, ROBE)
    cube("WaistBelt", (0, -0.02, 1.62), (0.7, 0.43, 0.12), HAIR, 0.05)
    cylinder("BeltMedallion", (0, -0.47, 1.6), 0.15, 0.06, GOLD, 32).rotation_euler.x = math.pi / 2
    cube("OracleArchiveTablet", (-0.52, -0.48, 1.82), (0.16, 0.04, 0.42), BONE, 0.04)
    for side in (-1, 1):
        s = "L" if side < 0 else "R"
        uv_sphere(f"Hand.{s}", (side * 0.78, -0.06, 1.55), (0.14, 0.13, 0.22), SKIN)
        sleeve = cone(f"Sleeve.{s}", (side * 0.66, 0, 2.22), 0.38, 0.22, 0.95, ROBE)
        sleeve.rotation_euler.y = side * 0.35

    uv_sphere("Neck", (0, 0, 2.95), (0.2, 0.18, 0.28), SKIN)
    uv_sphere("Head", (0, 0, 3.35), (0.42, 0.34, 0.52), SKIN)
    uv_sphere("CheekVolume", (0, -0.02, 3.18), (0.39, 0.31, 0.25), SKIN)
    uv_sphere("HairMass", (0, 0.02, 3.73), (0.50, 0.38, 0.34), HAIR)
    uv_sphere("HairFringe", (0, -0.28, 3.68), (0.42, 0.10, 0.16), HAIR)
    uv_sphere("HairBun", (0, 0.03, 4.08), (0.23, 0.2, 0.22), HAIR)
    cylinder("HairPin", (0, -0.02, 4.08), 0.025, 1.05, GOLD, 12).rotation_euler.y = math.pi / 2
    # Eyes and mouth are deliberately simple, so the asset remains lightweight.
    for side in (-1, 1):
        uv_sphere(f"Eye.{side}", (side * 0.16, -0.32, 3.42), (0.055, 0.028, 0.035), HAIR)
        brow = cone(f"Brow.{side}", (side * 0.16, -0.335, 3.52), 0.025, 0.012, 0.22, HAIR, 12)
        brow.rotation_euler.y = math.radians(90)
    uv_sphere("Nose", (0, -0.35, 3.30), (0.045, 0.05, 0.08), SKIN)
    uv_sphere("Mouth", (0, -0.335, 3.18), (0.085, 0.02, 0.018), GOLD)

    # Split the lower silhouette into two feet so the full-body stance reads clearly.
    for side in (-1, 1):
        foot = cube(f"Foot.{side}", (side * 0.28, -0.02, 0.18), (0.20, 0.34, 0.10), HAIR, 0.06)
        foot.rotation_euler.z = side * math.radians(3)

    arm = make_armature()
    for obj in list(bpy.context.scene.objects):
        if obj.name.startswith("REFERENCE_BOARD"):
            continue
        for col in list(obj.users_collection):
            col.objects.unlink(obj)
        model_collection.objects.link(obj)
    # Parent meshes to armature with automatic weights where possible.
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in meshes:
        o.select_set(True)
        arm.select_set(True)
        bpy.context.view_layer.objects.active = arm
        try:
            bpy.ops.object.parent_set(type="ARMATURE_AUTO")
        except RuntimeError:
            o.parent = arm
        o.select_set(False)
    arm.select_set(False)

    add_action(arm, "Idle_Breathing", [1, 24, 48], {"Chest": [(0, 0, 0), (0.02, 0, 0), (0, 0, 0)]})
    add_action(arm, "Thinking_Tilt", [1, 20, 40], {"Head": [(0, 0, 0), (0, 0, math.radians(4)), (0, 0, 0)]})
    add_action(arm, "Speaking_Gesture", [1, 16, 32], {"UpperArm.R": [(0, 0, 0), (0, math.radians(-12), 0), (0, 0, 0)]})
    add_action(arm, "Nod", [1, 12, 24], {"Head": [(0, 0, 0), (math.radians(8), 0, 0), (0, 0, 0)]})
    add_action(arm, "Blink", [1, 8, 16], {})

    # Keep a neutral scene and export all animations with the armature.
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 48
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.world.color = (0.015, 0.02, 0.025)
    bpy.ops.object.camera_add(location=(0, -10.5, 2.35))
    camera = bpy.context.object
    camera.name = "PreviewCamera"
    camera.data.lens = 58
    camera.rotation_euler = (Vector((0, 0, 2.2)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.camera = camera
    for col in list(camera.users_collection):
        col.objects.unlink(camera)
    model_collection.objects.link(camera)
    bpy.ops.object.light_add(type="AREA", location=(3.2, -4.5, 6.2))
    key = bpy.context.object
    key.name = "KeyLight"
    key.data.energy = 850
    key.data.shape = "DISK"
    key.data.size = 4.5
    key.rotation_euler = (math.radians(28), 0, math.radians(32))
    for col in list(key.users_collection):
        col.objects.unlink(key)
    model_collection.objects.link(key)
    bpy.ops.object.light_add(type="AREA", location=(-3.5, -1.5, 3.6))
    fill = bpy.context.object
    fill.name = "FillLight"
    fill.data.energy = 450
    fill.data.size = 3.0
    fill.rotation_euler = (math.radians(68), 0, math.radians(-60))
    for col in list(fill.users_collection):
        col.objects.unlink(fill)
    model_collection.objects.link(fill)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(MODEL_DIR, "digital-scholar.blend"))
    bpy.context.scene.render.filepath = os.path.join(MODEL_DIR, "digital-scholar-preview.png")
    bpy.context.scene.render.resolution_x = 640
    bpy.context.scene.render.resolution_y = 800
    bpy.context.scene.render.resolution_percentage = 100
    bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in model_collection.objects:
        if obj.type in {"MESH", "ARMATURE"}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.export_scene.gltf(filepath=os.path.join(MODEL_DIR, "digital-scholar.glb"), export_format="GLB", export_animations=True, export_materials="EXPORT", export_apply=True)
    print("DIGITAL_SCHOLAR_EXPORT_OK")


if __name__ == "__main__":
    build()
