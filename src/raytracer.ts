import {Bitmap, encodePNGToStream, make} from "pureimage"
import * as fs from "node:fs";
import test from "node:test";
import assert from "node:assert";

type Vec = {
    x: number,
    y: number,
    z: number,
}
type Ray = {
    point: Vec,
    vector:Vec,
}

type Sphere = {
    type:'sphere',
    point:Vec,
    color:Vec,
    specular: number,
    lambert:number,
    ambient:number,
    radius:number
}

type Scene = {
    camera: {
        point:Vec,
        fieldOfView:number,
        vector:Vec,
    }
    lights:Array<Vec>,
    objects:Array<Sphere>
}


const scene:Scene = {
    camera: {
        point: {
            x: 0,
            y: 1.8,
            z: 10,
        },
        fieldOfView: 45,
        vector: {
            x: 0,
            y: 3,
            z: 0,
        }
    },
    lights: [
        {
            x: -30,
            y: -10,
            z: 20,
        }
    ],
    objects: [
        {
            type: 'sphere',
            point: {
                x: 0,
                y: 3.5,
                z: -3,
            },
            color: {
                x: 155,
                y: 200,
                z: 155,
            },
            specular: 0.2,
            lambert: 0.7,
            ambient: 0.1,
            radius: 3,
        },
        {
            type: "sphere",
            point: {
                x: -4, y: 2, z: -1
            },
            color: {
                x: 155, y: 155, z: 155,
            },
            specular: 0.1,
            lambert: 0.9,
            ambient: 0.0,
            radius: 0.2
        },
        {
            type: 'sphere',
            point: {
                x: -4,
                y: 3,
                z: -1,
            },
            color: {
                x: 255,
                y: 255,
                z: 255,
            },
            specular: 0.2,
            lambert: 0.7,
            ambient: 0.1,
            radius: 0.1,
        }
    ]
}

let width = 640* 0.5;
let height = 480 * 0.5;

let data:Bitmap = make(width,height);

const UP:Vec = { x: 0, y: 1, z: 0 };
const ZERO:Vec =  { x: 0, y: 0, z: 0 };
const WHITE:Vec = {x: 255, y: 255, z: 255};

class Vector {
    static dotProduct(a: Vec, b: Vec): number {
        return (a.x * b.x) + (a.y * b.y) + (a.z * b.z)
    }
    static crossProduct(a: Vec, b: Vec): Vec {
        return {
            x: (a.y * b.z) - (a.z * b.y),
            y: (a.z * b.x) - (a.x * b.z),
            z: (a.x * b.y) - (a.y * b.x)
        }
    }
    static scale(a: Vec, t: number): Vec {
        return {
            x: a.x * t,
            y: a.y * t,
            z: a.z * t
        };
    }
    static unitVector(a: Vec): Vec {
        return Vector.scale(a, 1 / Vector.len(a))
    }
    static add(a: Vec, b: Vec) {
        return {
            x: a.x + b.x,
            y: a.y + b.y,
            z: a.z + b.z,
        }
    }
    static subtract(a: Vec, b: Vec): Vec {
        return {
            x: a.x - b.x,
            y: a.y - b.y,
            z: a.z - b.z,
        }
    }
    static add3(a:Vec,b:Vec,c:Vec): Vec {
        return {
            x:a.x+b.x+c.x,
            y:a.y+b.y+c.y,
            z:a.z+b.z+c.z,
        }
    }
    static len(a:Vec):number {
        return Math.sqrt(Vector.dotProduct(a,a))
    }
    static reflectThrough(a:Vec, normal:Vec):Vec {
        let d = Vector.scale(normal, Vector.dotProduct(a,normal))
        return Vector.subtract(Vector.scale(d,2),a)
    }

    static make(x: number, y: number, z: number) {
        return {x,y,z}
    }
}

function color_to_char(color:Vec) {
    let c = (color.x+color.y+color.z)/3;
    if (c < 10) return 'M'
    if (c < 255) {
        console.log(c)
    }
    if (c < 20) return 'm'
    if (c < 100) return 'x'
    if (c < 200) return '.'
    return ' '
}

function render(scene:Scene) {
    let camera = scene.camera
    let eyeVector = Vector.unitVector(Vector.subtract(camera.vector, camera.point))
    let vpRight = Vector.unitVector(Vector.crossProduct(eyeVector, UP))
    let vpUp = Vector.unitVector(Vector.crossProduct(vpRight, eyeVector))


    let fovRadians = (Math.PI * (camera.fieldOfView / 2)) / 180;
    let heightWidthRatio = height / width;
    let halfWidth = Math.tan(fovRadians);
    let halfHeight = heightWidthRatio * halfWidth;
    let cameraWidth = halfWidth * 2;
    let cameraHeight = halfHeight * 2;
    let pixelWidth = cameraWidth / (width - 1)
    let pixelHeight = cameraHeight / (height - 1)

    let ray:Ray = {
        point: camera.point,
        vector: ZERO
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let xcomp = Vector.scale(vpRight, x * pixelWidth - halfWidth);
            let ycomp = Vector.scale(vpUp, y * pixelHeight - halfHeight);
            ray.vector = Vector.unitVector(Vector.add3(eyeVector, xcomp, ycomp));
            let color = trace(ray, scene, 0)

            let ctx = data.getContext('2d')
            ctx.fillStyle = `rgb(${color.x},${color.y},${color.z})`;
            ctx.fillRect(x,y,1,1)
        }
    }
}

function trace(ray:Ray, scene:Scene, depth: number):Vec {
    if (depth > 3) return WHITE;

    let distObject = intersectScene(ray, scene)
    if (distObject[0] === Infinity) {
        return WHITE;
    }
    let dist:number = distObject[0]
    const object:Sphere = distObject[1];
    let pointAtTime = Vector.add(ray.point, Vector.scale(ray.vector, dist));
    return surface(
        ray,
        scene,
        object,
        pointAtTime,
        sphereNormal(object, pointAtTime),
        depth
    )
}

function intersectScene(ray:Ray, scene:Scene):[number,Sphere|null] {
    let closest:[number, Sphere|null] = [Infinity, null];
    for (let i = 0; i < scene.objects.length; i++) {
        let object:Sphere = scene.objects[i];
        let dist = sphereIntersection(object, ray)
        if (dist !== undefined && dist < closest[0]) {
            closest = [dist, object]
        }
    }
    return closest
}

function sphereIntersection(sphere:Sphere, ray:Ray):number|undefined {
    let eye_to_center = Vector.subtract(sphere.point, ray.point)
    let v = Vector.dotProduct(eye_to_center, ray.vector)
    let eoDot = Vector.dotProduct(eye_to_center, eye_to_center)
    let discriminant = sphere.radius * sphere.radius - eoDot + v * v;
    if (discriminant < 0) {
        return;
    } else {
        return v - Math.sqrt(discriminant)
    }
}

function sphereNormal(sphere:Sphere, pos:Vec) {
    return Vector.unitVector(Vector.subtract(pos, sphere.point))
}

function surface(ray:Ray, scene:Scene, object:Sphere, pointAtTime:Vec, normal: Vec, depth: number) {
    let b = object.color;
    let c = ZERO;
    let lambertAmount = 0;
    if (object.lambert) {
        for (let i = 0; i < scene.lights.length; i++) {
            let lightPoint = scene.lights[i];
            if (!isLightVisible(pointAtTime, scene, lightPoint)) continue;
            let contribution = Vector.dotProduct(
                Vector.unitVector(Vector.subtract(lightPoint, pointAtTime)),
                normal
            );
            if (contribution > 0) lambertAmount += contribution;
        }
    }
    if (object.specular) {
        const reflectedRay = {
            point: pointAtTime,
            vector: Vector.reflectThrough(ray.vector, normal),
        };
        let reflectedColor = trace(reflectedRay, scene, ++depth)
        if (reflectedColor) {
            c = Vector.add(c, Vector.scale(reflectedColor, object.specular))
        }
        lambertAmount = Math.min(1, lambertAmount)
    }
    return Vector.add3(
        c,
        Vector.scale(b, lambertAmount * object.lambert),
        Vector.scale(b, object.ambient)
    )
}

function isLightVisible(pt:Vec, scene:Scene, light:Vec) {
    const distObject = intersectScene(
        {
            point: pt,
            vector: Vector.unitVector(Vector.subtract(pt, light)),
        },
        scene
    );
    return distObject[0] > -0.005;
}


// render(scene);

// encodePNGToStream(data,fs.createWriteStream('out.png')).then(() => console.log("done writing to 'out.png'"))


test('vector tests',() => {
    let a = Vector.make(1,1,1);
    let b = Vector.make(6,7,8);
    assert.deepStrictEqual(Vector.dotProduct(a,b),21)
    assert.deepStrictEqual(Vector.add(a,b), Vector.make(7,8,9));
    assert.deepStrictEqual(Vector.subtract(a,b), Vector.make(-5,-6,-7));
    assert.deepStrictEqual(Vector.crossProduct(a,b), Vector.make(1,-2,1));
})