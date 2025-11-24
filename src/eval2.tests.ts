import test from "node:test";
import {BoolObj, cval, make_default_scope, NilObj, NumObj, Obj, ObjectProto, StrObj} from "./eval2.ts";


test('scope tests',() => {
    let scope:Obj = make_default_scope();
    // evaluates a number literal
    cval(` 5 .`,scope,NumObj(5))
    // self is the scope itself
    cval(` self .`,scope,scope)
    // the value message on a literal returns itself
    cval(' 5 value .',scope,NumObj(5))
    // block evaluates to the last statement
    cval('[ 5 . ] value .',scope, NumObj(5))
    // scope inside block can accept makeSlot. then looks up the v slot.
    cval(`[ self makeSlot "v" 5. self getSlot "v". ] value .`,scope, NumObj(5))
    cval(`[ self makeSlot "v" 5. self v. ] value .`,scope, NumObj(5))
    cval(`[ self makeSlot "v" 5. v. ] value .`,scope, NumObj(5))

    // group evaluates to the last expression in the group.
    cval('8 + 8.',scope,NumObj(16))
    cval('(8 + 8).',scope,NumObj(16))
    // cval('8 clone.',scope,NumObj(8))
    cval('Object clone.', scope, ObjectProto.clone())
    cval('[ Object clone. ] value .', scope, ObjectProto.clone())
    // make an object with one slot
    cval(`[
        self makeSlot "v" (Object clone).
        v makeSlot "w" 5.
        v w.
    ] value.`,scope,NumObj(5))
    cval(`[
        self makeSlot "v" (Object clone).
        v makeSlot "w" [ 5. ].
        v w.
    ] value.`,scope,NumObj(5))

    cval(`[
        self makeSlot "v" 5.
        [
          v.
        ] value.
    ] value .`,scope,NumObj(5))

    cval(`[
        self makeSlot "x" 5.
        self makeSlot "w" [ self x. ].
        self w.
    ] value .`,scope,NumObj(5))
})
test('nil',() => {
    let scope:Obj = make_default_scope();
    cval(`nil .`,scope, NilObj())
})
test('numbers',() => {
    let scope:Obj = make_default_scope();
    cval('4 .',scope,NumObj(4));
    cval('4 value .',scope,NumObj(4))
    cval('4 + 5.',scope,NumObj(9));
    cval('4 - 5.',scope,NumObj(-1));
    cval('4 * 2.',scope,NumObj(8));
    cval('4 / 2.',scope,NumObj(2));
    cval('(4 * 5) * 6.',scope,NumObj(120));
    cval('(4 + 5) * 6.',scope,NumObj(54));
    cval('4 + (5 * 6).',scope,NumObj(34));
})
test('booleans',() => {
    let scope:Obj = make_default_scope();
    cval('true .',scope,BoolObj(true));
    cval('false .',scope,BoolObj(false));
    cval('4 < 5 .',scope,BoolObj(true));
    cval('4 > 5 .',scope,BoolObj(false));
    cval('4 == 4 .',scope,BoolObj(true));
    cval('4 == 5 .',scope,BoolObj(false));
})
test('strings',() => {
    let scope = make_default_scope()
    cval('"foo" .', scope,StrObj("foo"))
    cval('"foo" + "bar" .', scope,StrObj("foobar"))
})
test('conditions',() => {
    let scope = make_default_scope()
    cval(` (4 < 5) if_true 88.`,scope,NumObj(88))
    cval(` (4 > 5) if_true 88.`,scope,NilObj())
    cval(` (4 < 5) if_false 88.`,scope,NilObj())
    cval(` (4 > 5) if_false 88.`,scope,NumObj(88))

    cval(` (4 < 5) cond 88 89.`,scope,NumObj(88))
    cval(` (4 > 5) cond 88 89.`,scope,NumObj(89))
    cval(` (4 < 5) cond (44+44) 89.`,scope,NumObj(88))

    cval(` (4 < 5) cond [88.] [89.].`,scope,NumObj(88))
    cval(` (4 > 5) cond [88.] [89.].`,scope,NumObj(89))
})
test('Debug tests',() => {
    let scope = make_default_scope()
    cval(`Debug print 0.`,scope,NilObj())
    cval(`Debug equals 0 0.`,scope,NilObj())
    cval(`Debug print 0 0.`,scope,NilObj())
})
test("block arg tests",() => {
    let scope = make_default_scope()
    cval(`
        self makeSlot "foo" [
            88.
        ]. 
        self foo.
     `,scope,NumObj(88))
    cval(`
        self makeSlot "foo" [ v |
            88.
        ].
        self foo 1.
        `,scope,NumObj(88))
    cval(`[
        self makeSlot "foo" [ v |
            88 + v.
        ].
        self foo 1.
     ] value .`,scope,NumObj(89))

    cval(`
        self makeSlot "foo" (Object clone).
        foo makeSlot "bar" 88.
        Debug equals (foo bar) 88.
        foo makeSlot "get_bar" [
            self bar.
        ].
        Debug equals (foo get_bar) 88.
        foo makeSlot "get_bar_better" [
            bar.
        ].
        Debug equals (foo get_bar_better) 88.
    `,scope, NilObj())
})
test('Point class',() => {
    let scope = make_default_scope()

    cval(`
        Global makeSlot "PointProto" (Object clone).
        PointProto makeSlot "name" "PointProto".
        PointProto makeSlot "magnitude" [
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
        Global makeSlot "Point" (PointProto clone).
        Point makeSlot "x" 0.
        Point makeSlot "y" 0.
        Point makeSlot "name" "Point".
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
    `,scope,
        StrObj("Point(6,6)")
    )
})
test("global scope tests",() => {
    let scope = make_default_scope()
    cval(`[
        Global makeSlot "foo" (Object clone).
        foo makeSlot "x" 5.
        foo makeSlot "bar" [
            self makeSlot "blah" (foo clone).
            blah x.
        ].
        foo bar.
    ] value .`,scope,NumObj(5))

    cval(`[
        Global makeSlot "Foo" (Object clone).
        Foo makeSlot "make" [
            self makeSlot "blah" (Foo clone).
            blah makeSlot "name" "Foo".
            blah.
        ].
        Foo makeSlot "bar" [
            self makeSlot "blah" (self make).
            blah name.
        ].
        Foo bar.
    ] value .`,scope,StrObj("Foo"))
})
test('assignment operator', () => {
    let scope = make_default_scope()
    cval(`[
        v ::= 5.
        v.
    ] value.`,scope,NumObj(5))
    cval(`[
        v ::= 5.
        v := 6.
        v.
    ] value.`,scope,NumObj(6))
    cval(`[
        T ::= (Object clone).
        T makeSlot "v" 44.
        T makeSlot "gv" [
            self v.
        ].
        T makeSlot "sv" [ vv |
            v := vv.
        ].
        T sv 88.
        T gv.
    ] value.`,scope,NumObj(88))
})
test ('fib recursion',() => {
    let scope = make_default_scope()
    cval(`[
        Math ::= Object clone.
        Math makeSlot "fib" [n|
            (n == 0) if_true [ return 0. ].
            (n == 1) if_true [ return 1. ].
            (Math fib ( n - 2 ) ) + (Math fib (n - 1 ) ).
        ].
        Math fib 6.
     ] value . `,scope,NumObj(8))
})
test('non local return', () => {
    let scope = make_default_scope();
    cval(`[ 
        T ::= (Object clone).
        T makeSlot "nl" [ 
          ( 4 > 5 ) cond [
            "method 1" print.
            return 1.
          ] [ 
            "method 2" print.
            return 2.
          ].
          "after return" print.
        ].
        T nl. 
    ] value.`,scope,NumObj(2))
})
test('non local return 2', () => {
    let scope = make_default_scope();
    cval(`[
        return 4 + 5.
    ] value.`,scope,NumObj(9))
})
test('list class', () => {
    let scope = make_default_scope()
    cval('list ::= (List clone).',scope);
    cval(`[
        list push 7.
        list push 8.
        list push 9.
        list len.
    ] value.`,scope,NumObj(3))
    cval(`[
        list at 0.
    ] value.`,scope,NumObj(7))
    cval(`[
        list setAt 0 88.
        list at 0.
    ] value.`,scope,NumObj(88))
})
test('eval vector class',() => {
    let scope = make_default_scope()
    cval(`[
        Global makeSlot "Vector" (ObjectBase clone).
        Vector setObjectName "Vector".
        Vector makeSlot "x" 0.
        Vector makeSlot "y" 0.
        Vector makeSlot "z" 0.
        Vector makeSlot "x:" [xx |
            self setSlot "x" xx.
        ].
        Vector makeSlot "make" [ xx yy zz |
            self makeSlot "v" (Vector clone).
            v setSlot "x" xx.
            v setSlot "y" yy.
            v setSlot "z" zz.
            v.
        ].
        Vector makeSlot "add" [a |
          Vector make 
                ((a x) + (self x))
                ((a y) + (self y))
                ((a z) + (self z)).
        ].
        a ::= (Vector make 1 1 1).
        
        // check the setter
        a x: 55.
        Debug equals (a x) 55.
        
        b ::= (Vector make 6 7 8).
        c ::= (a add b).
        c z.
    ] value.`,scope,NumObj(9))
})
test('fizzbuzz',() => {
    let scope = make_default_scope()
    cval(`
    [
    1 range 100 [ n |
        three ::= ((n mod 3) == 0).
        five ::= ((n mod 5) == 0).
        (three and five) if_true [ 
            return ("FizzBuzz" print).  
        ].
        three if_true [ "Fizz" print. ].
        five if_true [ "Buzz" print. ].
    ].
    88. 
    ] value .`,scope,NumObj(88))
})
test('JS style function calls ',() => {
    let scope = make_default_scope()
    // a.x => (a x)
    // a.x + 5 => (a x) + 5
    // a.do => (a do)
    // a.do 5 => (a do) 5
/*
    This won't work because a do has to resolve by itself before getting it's argument.
    options:

    * a.do resolves to a new CompId AST instead of Grp(Id,Id)
        the eval function then needs to handle this differently then the regular
        (receiver message args) message send.
    * a.do resolves to Grp(Id,Id) and we don't resolve message calls inside of a group if they don't
    have arguments. It should wait until it has at least one arg before executing. How do you know if it has an arg?
    * no var args. methods declare how many args they want and the resolver complains if there aren't enough.
    * we still need a way to cascade messages.


    foo bar 5 should execute foo.bar(5)
    then foo bar 5 baz 6 should execute foo.bar(5).baz(6).

    So we could use the comma operator for cascading, so
       foo bar 5, baz 6 would execute foo.bar(5).baz(6).

    or we can just use parens to delimit method calls. You always need parens
    and args must always be inside them.

    Can we make this optional? use parens for clarification but you don't *have* to do it.

    meth() is a method call
    foo.meth() is a method call with the receiver foo
    bar.foo.meth() is a method call with the receiver bar.foo

    meth(a) is a method call with the argument a

    foo.meth(a) is a method call on foo with the argument a

    foo.meth(a).bar() is a method call on foo with the argument a, then a second method call bar on the return result of foo.





 */
    // cval(`
    //     a ::= (Object clone).
    //     a makeSlot "x" 55.
    //     Debug equals (a x) 55.
    //     Debug equals (a.x) 55.
    //     Debug equals a.x 55.
    //
    //     a makeSlot "do" [xx|
    //         (self x) + xx.
    //     ].
    //
    //     Debug equals (a do 1) 56.
    //     Debug equals (a do 1) 56.
    //
    //     99.
    // `,scope,NumObj(99))
})