
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
logic makeSlot: "sendCommand:with:" with: [ cmd arg |
    Debug print: ("logic got command " + cmd).
    (cmd == "selectedSymbol") ifTrue: [
        self selectedSymbol: arg.
        self renderSymbols.
        self renderMethods.
    ].
    (cmd == "selectedMethod") ifTrue: [
        self selectedMethod: arg.
        self renderMethods.
    ].
]
Global makeSlot: "logic" with: logic.

logic make_data_slot: "sul" with: sul.

sul makeSlot: "sendCommand:with:" with: [ cmd arg |
    logic sendCommand: cmd with: arg.
].

logic makeSlot: "renderSymbols" with: [
    ul := self sul.
    ul clear.
    sym := self selectedSymbol.
    Global getSlotNames do: [k v |
        li := dom make: "li".
        li innerHtml: k.
        (sym == k) ifTrue: [
           li addClass: "selected".
        ].
        li onClick: [
            ul sendCommand: "selectedSymbol" with: k.
        ].
        ul append: li.
    ].
].

logic makeSlot: "renderMethods" with: [
    ul := self mul.
    ul clear.
    sym := self selectedSymbol.
    Debug print: ("selected symbol is " + sym).
    Debug print: ("actual symbol is" + (Global getSlot: sym)).
    obj := (Global getSlot: sym).
    Debug print: ('slot names is' + (obj getSlotNames)).
    meth := self selectedMethod.
    obj getSlotNames do: [k v |
        li := dom make: "li".
        li innerHtml: k.
        (meth == k) ifTrue: [
           li addClass: "selected".
        ].
        li onClick: [
            ul sendCommand: "selectedMethod" with: k.
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
    logic sendCommand: cmd with: arg.
].

methods append: mul.
logic make_data_slot: "mul" with: mul.


logic renderSymbols.
logic renderMethods.
//logic renderSource.

] value.