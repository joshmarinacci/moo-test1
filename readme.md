# MOO Lang: Minimal Object Oriented Language

This is a minimal implementation of a Smalltalk / Self like language.  

## Features
* Moo uses prototypes (like Self), with single inheritance and has no
classes or metaclasses. To create a new object clone an existing one.
* Like Self, there are data slots and method slots.
  * Data slots are created with `make_data_slot:with:`. 
    When you create a data slot the getter and setter are automatically created for you.
    Ex: `foo make_data_slot: "speed" with: "88"` creates the methods `speed` and `speed:`. 
  * Methods are created with `understands:with:`. Ex: `foo understands: "speak" with: [ "hi there!" ].`
* Moo has a subset of the standard Smalltalk Number, String, Boolean, and Collections APIs.
* It has a minimal web-based REPL and a DOM wrapper api to create HTML elements manually.
* It has a minimal JS proxy API so you can manipulate JS objects from pure Smalltalk code.

## Limitations

* Moo currently uses a tree-walk interpreter written in Typescript instead of byte code. It is not self-hosting yet and many of the 
  built-in methods are implemented in TS, not Smalltalk.
* It doesn't have a debugger and inspector (yet!).

## Syntax

Moo uses mostly standard Smalltalk syntax. Notable changes: 

* Comments use `//` instead of double quotes. 
* Strings can use double or single quotes.
* Concatenate strings with `+`.
* Identifiers can begin with `_`. ex: `_abc`. Generally used to indicate something is for internal use only.
* Numbers can contain `_` within them for clarity. `1_000_000`.
* It adds a JSON like literal syntax for Lists and Dicts.
  ex: `foo_dict := { x:0, y:55}` and `bar_list :=  {1,2,3}`.

## Goals

* to play around with turtle graphics and classic smalltalk algorithms.
* to create an embedded version implemented in Rust for microcontrollers.
* to create a web version with a Notion like notebook system that can seamlessly mixes prose and computation.
* experiment with math like APIs and using Greek symbols for variables and operations.
 

## Roadmap

* implement proper debugging and inspection in the
* implement `doesNotUnderstand:` and message resending.
* add more APIs to access files, URLs, and manipulate images.
* build a proper class browser and editor.

## Running

* run the unit tests with `npm test`.
* Run the web repl with `npm run dev`.

## Resources

* [The evolution of Smalltalk: from Smalltalk-72 through Squeak](https://dl.acm.org/doi/10.1145/3386335) by Dan Ingalls.
* [Self Language Homepage/](https://selflanguage.org/).



## Tasks

* [ ] implement Boolean `ifTrue:` and `ifFalse:` in pure ST that calls `ifTrue:ifFalse`.
* [ ] figure out how to pause and restart execution in the tree-walk interpreter.
* [ ] make image api work in browser with HTML canvas.
* [ ] add example code to the browser repl.
* [ ] add missing collections apis with tests
* [ ] flesh out the string api
* [ ] make some of the [Advent JS](https://adventjs.dev/en) challenges working. 