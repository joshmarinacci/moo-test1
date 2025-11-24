# MOO Lang: Minimal Object Oriented Language

This is a minimal implementation of a Smalltalk / Self like language.  
It uses prototypes (like Self), with single inheritance and has no
classes. To create a new class like thing (a prototype) clone an existing one.

Method calls are message sends with an arbitrary number of arguments, so you need
to use statements (ending with '.') to separate method calls. Message names (selectors)
must be a single word. Keyword style selectors (`at:do:`) are not supported.


This creates a Point prototype:

```smalltalk

// make a global slot called PointProto by cloning Object.
Global makeSlot "PointProto" (Object clone).
PointProto makeSlot "name" "PointProto".

// add methods but no data yet.
PointProto makSlot "magnitude" [
    self makeSlot "xx" ((self x) * (self x)). 
    self makeSlot "yy" ((self y) * (self y)). 
    ((self yy) + (self xx)) sqrt.
].
PointProto makeSlot "+" [ a |
    self makeSlot "xx" ( (self x) + (a x) ). 
    self makeSlot "yy" ( (self y) + (a y) ).
    self makeSlot "pp" (Point make
        ((self x) + (a x))
         ((self y) + (a y))).
    pp.
].
PointProto makeSlot "print" [
    (("Point(" + (self x)) + ("," + (self y))) + ")".
].

// create the Point 'class' which contains the x & y fields.
Global makeSlot "Point" (PointProto clone).
Point makeSlot "x" 0.
Point makeSlot "y" 0.
Point makeSlot "name" "Point".
// the "constructor"
Point makeSlot "make" [ x y |
    self makeSlot "pp" (Point clone).
    pp setSlot "x" x.
    pp setSlot "y" y.
    pp.
].

pt ::= (Point make 5 5).
Debug equals (pt x) 5.
Debug equals (pt y) 5.
pt magnitude.

self makeSlot "pt2" (Point make 1 1).

self makeSlot "pt3" (pt + pt2).
pt3 dump.
pt3 print.
```


# Syntax

* **numbers**: only integers. `-1234`
* **strings**: double quotes. `"foo"`
* **comments**: double slash to the end of line `// a comment`
* **booleans**: `true` and `false` are global instances of the built in `BooleanObject`. operators: `or` and `and`. messages: `if_true`, `if_false`, 
 and `cond`.  

To make the code cleaner, we add the dot, `.` operator for object field resolution, so instead of `4 + (self x)` you
can type `4 + self.x`.

a.b => (a b)



`a.x => (a x)`

`a.x + 5 => (a x) + 5`

`a.do => (a do)`

`a.do 5 => (a do) 5`

This won't work because `a do` has to resolve by itself before getting its argument. options:

* a.do resolves to a new CompId AST instead of Grp(Id,Id)
     the eval function then needs to handle this differently then the regular
     (receiver message args) message send.
* a.do resolves to Grp(Id,Id) and we don't resolve message calls inside of a group if they don't
have arguments. It should wait until it has at least one arg before executing. How do you know if it has an arg?
* no var args. methods declare how many args they want and the resolver complains if there aren't enough.
* we still need a way to cascade messages.

A lot of problems would go away if the parser knew that something was a message name, and if it knew how many args
a method takes. In the Self syntax, keyword messages end with a `:` and binary messages are always operators, which is a sequence of 
symbols like `+`, `-`, `;`, etc.

Primitive methods begin with _ so we can know that they go to the underlying implementation, not other self code.

To make my code clearer we can rule that all messages which take one argument must be *either* an operator, or else end with
a colon. Otherwise it takes zero arguments.  This means we can then do the forth style evaluation of an array of identifiers.
So `a b c` means `a.b().c()` because b and c aren't symbols and don't end in a keyword.  `a b: c` means `a.b(c)` because `b:`
means it is expecting a parameter.  `a b:c d.` means `a.b(c).d` because d is still in the same statement. To have `d` not be
chained it should be in its own statement like this: `a b:c. d.`.

impl changes
* parser shouldn't need to change.
* eval:
  * if message name is a symbol, it must be binary. take one arg, eval, then return.
  * if message name is a keyword: it must be binary. take one arg, eval, then return.
  * if message name is not one of the above, it must be unary, so take no args, eval, then return.
* once evaluated, if there are still unused elements in the statement, then send them to the object that was returned from the eval.


The problem now is what to do about longer sets of arguments. What about making a Vector? It needs three parameters for x,y, and z.
In Self they use capital letter keyword messages to distinguish between the first and later keyword names. so creating a vector would
look like `Vector x: 1 Y: 2 Z: 3`. I don't love that you need to remember the capitalization.

`Vector x:1 y:2 z:3` vs `Vector.make(1,2,3)` vs `Vector.make({x:1,y:2, z:3)` vs `Vector { x:1 y:2 z:3 }`.
A lot comes down to whether the make is the name of the method or x:y:z: is the name? by smalltalk rules it would be the latter.
I like having a method name separate from the keyword names. So `Vector make { x:1 y:2 z:3 }`.  There's a lot to be
said for using parenthesis for function application with optional commas. Do we need keyword based arguments? They certainly
can be handy, though.  `Vector make: { x:1 y:2 z:3 }` vs `Vector make x:1 y:2 z:3`. 


Let's try a bigger exmaple. Let's consider this typescript code.

```typescript

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


```

In a Smalltalk it would be like this:


```smalltalk

scene.intersect := [ray |
   closest := {amount:Infinity, obj:nil}. // create a temp object with two slots, amount & obj
   objects forEach: [obj |
      dist := object intersect: ray.
      dist notNil and: (dist < closest.amount) ifTrue: [
         closest := {amount:dist, obj:obj}.
      ]      
   ]
].

```


```typescript

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


```


```smalltalk
sphere intersect := [ray |
  eye = self point - ray point.
  v = eye dot: ray vector.
  eoDot = eye dot: eye.
  discr = self radius pow: 2 - eoDot + v pow: 2.
  discr >= 0 ifTrue: [ ^ v - discr sqrt. ]
  ^ nil.
] 

eye = self.point - ray.point.
v = eye @dot ray.vector.
discr = self.radius @pow 2 - (eye @dot eye) + v @pow 2.
desc < 0 ifTrue: nil 
         ifFalse: v - discr @sqrt.
// anything beginning with @ will be replaced at rendering time with a mathematical notation.

```