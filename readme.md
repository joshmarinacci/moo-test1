# MOO Lang: Minimal Object Oriented Language

This is a minimal implementation of a Smalltalk / Self like language.  
It uses prototypes (like Self), with single inheritance and has no
classes. To create a new class like thing (a prototype) clone an existing one.

Method calls are message sends with an arbitrary number of arguments, so you need
to use statements (ending with '.') to separate method calls.


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