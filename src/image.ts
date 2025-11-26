import test from "node:test";
import {cval, eval_block_obj, ListObj, make_default_scope, NilObj, NumObj, Obj, ObjectProto} from "./eval2.ts";
import {Bitmap, encodePNGToStream, make} from "pureimage"
import * as fs from "node:fs";

function make_scope_with_image() {
    let scope = make_default_scope()
    const ImageProto = new Obj("ImageProto",ObjectProto,{
        'make:':(rec:Obj, args:Array<Obj>):Obj => {
            console.log("make called")
            let image = new Obj("Image",ImageProto,{});
            image.make_slot("width",args[0])
            image.make_slot("height",args[1])
            image._make_js_slot("jsvalue",make(10,10))
            return image
        },
        'save:':(rec:Obj, args:Array<Obj>):Obj => {
            let bitmap = rec._get_js_array() as unknown as Bitmap
            // console.log("bitmap",bitmap)
            let filename = args[0]._get_js_string();
            console.log(`saving bitmap to ${filename}`)
            encodePNGToStream(bitmap,fs.createWriteStream(filename)).then(() => {
                console.log("finished writing to stream")
            })
            return NilObj()
        },
        'setPixelAt:':(rec:Obj, args:Array<Obj>):Obj => {
            let bitmap = rec._get_js_array() as unknown as Bitmap
            let x = args[0]._get_js_number()
            let y = args[1]._get_js_number()
            let c = args[2]._get_js_number()
            // console.log(`setting pixel at ${x},${y} `, 'c', c.toString(16))
            bitmap.setPixelRGBA(x,y,c)
            return NilObj()
        },
        'fill:':(rec:Obj, args:Array<Obj>):Obj => {
            console.log("filling", args[0])
            let bitmap = rec._get_js_array() as unknown as Bitmap
            for(let j = 0; j<bitmap.height; j++) {
                for (let i = 0; i < bitmap.width; i++) {
                    let ii = NumObj(i)
                    let jj = NumObj(j)
                    let ret = eval_block_obj(args[0],[ii,jj]) as Obj
                    bitmap.setPixelRGBA(i,j,ret._get_js_number())
                }
            }
            return NilObj()
        }
    });
    scope.make_slot("Image",ImageProto)
    const ColorProto = new Obj("ColorProto",ObjectProto,{
        'from:':(rec:Obj, args:Array<Obj>):Obj => {
            let data = args[0]._get_js_array()
            let red = data[0]._get_js_number()
            let green = data[1]._get_js_number()
            let blue = data[2]._get_js_number()
            let rgba = (red << 24) | (green << 16) | (blue << 8) | 255;
            return NumObj(rgba)
        },
    })
    scope.make_slot("Color",ColorProto)
    cval(`[
        Color makeSlot "red"   16rFF0000FF.
        Color makeSlot "green" 16r00FF00FF.
        Color makeSlot "blue"  16r0000FFFF.
        Color makeSlot "white" 16rFFFFFFFF.
        Color makeSlot "black" 16r000000FF.
        ] value.`,scope)
    return scope
}
test('set pixels color',() => {
    const scope = make_scope_with_image()
    cval(`[
        Color makeSlot "teal" (Color from: { 0 255 255 }).
        Color makeSlot "yellow" (Color from: { 255 255 0 }).
        Color makeSlot "magenta" (Color from: { 255 0 255 }).
    
        image ::= (Image make: 10 10).
        Debug print image.
        Debug equals (image width) 10.
        Debug equals (image height) 10.
        blue ::= (Color from: { 0 0 255 }).
        image setPixelAt: 0 0 (Color red).
        image setPixelAt: 1 0 (Color green).
        image setPixelAt: 2 0 (Color blue).
        image setPixelAt: 3 0 (Color white).
        image setPixelAt: 4 0 (Color black).
        image setPixelAt: 5 0 (Color teal).
        image setPixelAt: 6 0 (Color yellow).
        image setPixelAt: 7 0 (Color magenta).
        image save: "foo.png".
        88.
     ] value.`, scope, NumObj(88))
})
test('fill image',() => {
    const scope = make_scope_with_image()
    cval(`[
        image ::= (Image make: 10 10).
        image fill: [x y |
            ((x mod 2) == 0) if_true [ return (Color red). ].
            ((y mod 2) == 0) if_true [ return (Color green). ].
            Color black.
          ].
        image save: "bar.png".
     ] value.`, scope)
})
