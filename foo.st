
[
// make a wrapper div
dom clear.
hbox := dom make: "div" class:"hbox".
dom append: hbox.

// classes column
classes := dom make: "div" class: "vbox".
classes addClass: "scroll".
hbox append: classes.

sul := dom make:"ul".
classes append: sul.

logic := (Object clone).
logic make_data_slot: "selectedSymbol" with: "Object".
logic make_data_slot: "selectedMethod" with: "".
Global makeSlot: "logic" with: logic.

logic make_data_slot: "sul" with: sul.

sul makeSlot: "sendCommand:with:" with: [ cmd arg |
    Debug print: ("symbols got command " + cmd).
    logic sendCommand: cmd with: arg.
    logic renderSymbols: arg.
    logic renderMethods: "".
].


logic makeSlot: "renderSymbols:" with: [ name |
    ul := self sul.
    ul clear.
    self selectedSymbol: name.
    sym := self selectedSymbol.
    Global getSlotNames do: [k v |
        li := dom make: "li".
        li innerHtml: k.
        (sym == k) ifTrue: [
           Debug print: "found the match".
           li addClass: "selected".
        ].
        li onClick: [
            Debug print: "clicked here".
            ul sendCommand: "selected" with: k.
        ].
        ul append: li.
    ].
].

logic makeSlot: "renderMethods:" with: [ name |
    ul := self mul.
    ul clear.
    sym := self selectedSymbol.
    Debug print: ("selected symbol is " + sym).
    Debug print: ("actual symbol is" + (Global getSlot: sym)).
    obj := (Global getSlot: sym).
    Debug print: ('slot names is' + (obj getSlotNames)).
    self selectedMethod: name.
    meth := self selectedMethod.
    obj getSlotNames do: [k v |
        li := dom make: "li".
        li innerHtml: k.
        (name == k) ifTrue: [
           Debug print: "found the match".
           li addClass: "selected".
        ].
        li onClick: [
            Debug print: "clicked here".
            ul sendCommand: "selected" with: k.
        ].
        ul append: li.
    ].
].

logic makeSlot: "renderSource" with: [
  Debug print: ("showing the source to " + self selectedSymbol + " " + self selectedMethod).
].



 // methods column
 methods := dom make: "div" class: "vbox".
 methods addClass: "scroll".
 hbox append: methods.

 mul := dom make: "ul".
 mul makeSlot: "sendCommand:with:" with: [ cmd arg |
   Debug print: ("methods got command " + cmd).
   Debug print: arg.
   logic renderMethods: arg.
   logic renderSource.
 ].
 methods append: mul.
logic make_data_slot: "mul" with: mul.


logic renderSymbols: "Number".
logic renderMethods: "value".
logic renderSource.

] value.