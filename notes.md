




# next up

- [x] Lists are having a shared js list array.
- [ ] collections
  - [x] List, Dict, Set == by reference to start
  - [x] new JSset impl
  - [ ] List print. impl in ST by mapping to str then joining with add.
  - [ ] Dict print
  - [ ] Set print
- [x] Object ==  same name, same hashcode. same JS ref?
- [ ] expose Object isKindOf:
  - this uses boolean object, so we need to add it later in the init process.
- [ ] units
  - [x] 10 unit: “meters”
  - [x] Turns into UnitNumber with new arithmetic functions
  - [x] Print turns into string
  - [ ] Number withUnit: unit. returns UnitNumber
  - [ ] 10m * 2ft as: “square inches”
  - [ ] UnitNumber as: unit.  returns new number with the unit conversion, or throws error. ex: 10m * 2ft as "square inch". 
  - [ ] unit: sets the unit. turns string into proper unit object. can parse dimensions too.
  - [ ] make Unit enum. Meters, Millimeters, Feet, Inches
  - [ ] update parser to support 10.5_meters shorthand.
  - [ ] Number_unitname is sugar for UnitNumber amount: number unit: unitname.

```smalltalk
Unit makeMethod: "init" [ 
  Meter ::= Unit clone. 
  Meter name: 'meter'.
  Millimeter ::= Unit clone.
  Millimeter name: 'millimeter'.
  Meter addConversion: Millimeter 1000.
  Millimeter addConversion: Meter 0.001. 
].
Unit makeMethod: "print": [
  self name.
].  
Unit makeMethod: "hashcode": [
  ("unit_" + (self name)).
]

Unit init.
 
 
A ::= (5 unit: (Unit Meter)).
B ::= (0.5 unit: (Unit Meter)).
C ::= ((A + B) as: (Unit Millimeter)).
Debug equals (C amount) 5500.
Debug equals (C unit) (Unit Millimeter).
Debug equals (C dimension) 1.

```


* delegation
  * capture does not understand to resend a message to another target.
  * number.append doesn't exist. is caught. resends to number.print.
  * `5 append: 5` returns the *string* `55`.
  * Number.doesNotUnderstand [mess args | (self print) sendMessage mess args.


## GUI and GFX and Output

* Design simple gfx and input model for interactive code browser
  - [ ] Show list of current objects and methods
  - [x] Manipulate the DOM directly
  - [x] DomProxy to access the dom.
  - [ ] AsDOM to render self to an html element
  - [ ] View but not edit source code
  - [ ] Splat the entire object graph to and from JSON and local storage
  - [ ] Render. List of classes. Project to DOM LI
  - [ ] Button to trigger loading and rendering the scope
  - [ ] ObjectBrowser render: DOMProxy.  
    - [ ] list all objects in global scope 

Page loads JS source to set up the entire env.  There is a plain JS button. Clicking the button will invoke 
```
[
  dom ::= ((DOMProxy clone) init).
  ObjectBrowserDemo render: dom.
] value. 

dom clear.
(Global listSlotNames) do:  [ v |
  Debug print: v.
  button ::= (dom makeButton: v).
  button onClick: [
     Debug print: ("this object is " + v) .
  ].
  dom append: button.
].

(Global getSlotNames) do: [k v |
  button ::= (dom makeButton: k).
  button onClick: [
     Debug print: ("this object is " + k) .
     Debug print: v.
  ].
  dom append: button.
].

```


## impl plan
* [ ] Smalltalk class browser:
* [ ] Vbox and hbox have mirror dom elements and forward commands to their delegate
* [ ] Dom element: toggle classname on any dom element, append element to self
* [ ] Dom proxy: create element with name, id, and classes
* [ ] HTML List Item has text and command and delegate. Click sends command to delegate.
* [ ] HTML List has list items and delegate. Forwards commands to delegate.
* [ ] Top level delegate receives commands for changing the selected object
* [ ] Common widget class with delegate, dom mirror, send command method.
* [ ] List of objects, list of methods on selected object. Inside an hbox.



## parser
Fix precedence of parsing so that we don't need so many parens
 unary > binary > keyword

next to fix
* [x] fully recursive with group
* [x] block literal
* [x] statement is expr followed by a period
* [x] return is exp prefixed by a caret. non-local return tests
* [x] assignment can have any expression on the right hand side but only id on the right side
* [ ] block literal eval args aren't working
* [x] list api
* [x] dict api
* [ ] set api
* [ ] list literal
* [ ] dict literals
* [ ] comments again





## Ideas

* How can do worlds? be able to 'fork' the world, do crazy stuff, then diff between the world and it's parent world. should be lazy copy on write. 