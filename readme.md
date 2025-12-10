# MOO Lang: Minimal Object Oriented Language

This is a minimal implementation of a Smalltalk / Self like language.  

## Features
* It uses prototypes (like Self), with single inheritance and has no
classes & metaclasses. To create a new class like thing (a prototype) clone an existing one.
* Data slots are created with `make_data_slot:with:`. Methods are created with `understands:with:`. 
* Moo currently has a subset of the standard number, string, boolean, and object APIs.
* It has a minimal web-based REPL and a Dom wrapper api to create dom elements manually.
* It has a minimal JS proxy api so you can manipulate JS objects from Smalltalk. 

## Syntax
Moo uses mostly standard Smalltalk syntax. 

* It adds a JSON like literal syntax for Lists and Dicts. 
ex: `foo_dict := { x:0, y:55}` and `bar_list :=  {1,2,3}`. 
* Comments use `//` instead of double quotes. 
* Strings can use double or single quotes.
* Identifiers can begin with `_`. ex: `_abc`. Generally used to indicate something is for internal use only.
* Numbers can contain `_` within them for clarity. `1_000_000`.

## Goals

* to play around with turtle graphics and classic smalltalk algorithms.
* to create an embedded version implemented in Rust for microcontrollers.
* to create a web version with a Notion like notebook system that can seamlessly mixes prose and computation.

## Resources

* [The evolution of Smalltalk: from Smalltalk-72 through Squeak](https://dl.acm.org/doi/10.1145/3386335) by Dan Ingalls.
* [Self Language Homepage/](https://selflanguage.org/).

