
dom clear.


hbox := dom make: "div" class:"hbox".
dom append: hbox.

column := dom make: "div" class: "vbox".
column addClass: "scroll".
hbox append: column.

ul := dom make:"ul".
column append: ul.

Global getSlotNames do: [k v |
    li := dom make: "li".
    li innerHtml: k print.
    li onClick: [
       Debug print: "clicked on " + v.
    ].
    ul append: li.
].
