
Vector := Object clone.
Vector make := [x,y,z |
    v := Vector clone
    v x := x.
    v y := y.
    v z := z.
].
Vector add := [v|
    make (
        (self x + v x),
        (self y + v y),
        (self z + v z)
        ).
].
Vector sub := [v|
    make (
        (self x - v x),
        (self y - v y),
        (self z - v z)
        ).
].
Vector scale := [s|
    make (
        (self x * s)
        (self y * s)
        (self z * s)
        ).
].
Vector dot := [v|
    (self x * v x) + (self y * v y) + (self z + v z).
].
Vector cross := [v|
    make(
        ((a y * b z) - ( a z * b y))
        ((a z * b x) - ( a x * b z))
        ((a x * b y) - ( a y * b x))
    ).
].

Vector unit := [
    self scale ( 1 / self len).
].

Vector len := [
    (self dot self) sqrt.
].

Vector reflect := [
    d := normal scale (a dot normal).
].


Sphere := Object clone.
Sphere intersectRay := [ray|
    eye := (self point) - (ray point).
    v := eye dot (ray vector).
    eoDot := eye dot eye;
    disc := sphere radius * sphere radius - eoDot + v * v.
    (disc < 0) ifTrue ^nil.
    ^ v - (disc sqrt).
].

Sphere normal := [pos|
    ^ (pos - self point) unit.
].


Scene trace := [ray depth|
    (depth > 3) ifTrue [^ WHITE].
    distObj = scene intersect ray.
    (distObj first == Infinity) ifTrue [ ^ WHITE ].
    dist = distObj first.
    sphere = distObj second.
    t = ray point + (ray vector scale dist).
    ^ self surface ray sphere t (sphere normal t) depth.
]

Scene intersect := [ray|
    closest := Pair Infinity nil.
    (self objects) forEach [ obj |
        dist := obj intersect ray.
        ((dist notNil) and (dist < closest amt)) ifTrue [
            closest := Pair dist obj
        ].
    ].
    ^ closest.
].


Scene surface := [ray sphere t normal depth |
    b := sphere color.
    c := ZERO.
    lambert := 0.
    sphere hasLambert ifTrue [
        self lights filter [light| light visibleAt t self].
            do [ lambert := lambert + (light point - t) unit dot normal ].
    ].
    sphere hasSpecular ifTrue [
        reflected := (Ray make t (ray vector reflect normal)).
        color := self trace reflected (depth + 1).
        color notNil ifTrue [ c := c + (color scale (sphere specular)).
        lambert = 1 min lambert.
    ].
    ^ c + b scale (lambert * sphere lambert) + b scale (sphere ambient).
].

Light visibleAt := [pt scene |
    dist := scene intersect (Ray make pt ((pt - self pt) unit) ).
    ^ (dist > -0.005).
]