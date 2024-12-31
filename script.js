const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')

const Balls = []
const Walls = []

let LEFT, UP, RIGHT, DOWN
let friction = 0.05

class Vector {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y)
    }
    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y)
    }
    mag(){
        return Math.sqrt(this.x ** 2 + this.y ** 2)
    }
    mul(n){
        return new Vector(this.x * n, this.y * n)
    }
    normal(){
        return new Vector(-this.y, this.x).unit()
    }
    unit(){
        if(this.mag() == 0)
            return new Vector(0, 0)
        return new Vector(this.x / this.mag(), this.y / this.mag())
    }

    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y
    }

    drawVec(start_x, start_y, n, col) {
        ctx.beginPath()
        ctx.moveTo(start_x, start_y)
        ctx.lineTo(start_x + this.x * n, start_y + this.y * n)
        ctx.strokeStyle = col
        ctx.stroke()
    }
}

class Ball{
    constructor(x, y, rad, m) {
        this.pos = new Vector(x, y)
        this.rad = rad
        this.m = m
        if(this.m === 0){
            this.inv_m = 0
        } else {
            this.inv_m = 1 / this.m
        }
        this.elasticity = 6
        this.vel = new Vector(0, 0)
        this.acc = new Vector(0, 0)
        this.acceleration = 5
        this.isControlled = false
        Balls.push(this)
    }
    drawBall() {
        ctx.beginPath()
        ctx.arc(this.pos.x, this.pos.y, this.rad, 0, 2 * Math.PI)
        ctx.strokeStyle = 'black'
        ctx.stroke()
        ctx.fillStyle = 'red'
        ctx.fill()
    }
    display() {
        this.vel.drawVec(this.pos.x, this.pos.y, 10, 'green')
        ctx.fillStyle = 'black'
        ctx.fillText('m = ' + this.m, this.pos.x - 10, this.pos.y - 5)
        ctx.fillText('e = ' + this.elasticity, this.pos.x - 10, this.pos.y + 5)
    }
    reposition(){
        this.acc = this.acc.unit().mul(this.acceleration)
        this.vel = this.vel.add(this.acc)
        this.vel = this.vel.mul(1 - friction)
        this.pos = this.pos.add(this.vel)
    }
}

class Wall{
    constructor(x1, y1, x2, y2){
        this.start = new Vector(x1, y1)
        this.end = new Vector(x2, y2)
        Walls.push(this)
    }
    drawWall(){
        ctx.beginPath()
        ctx.moveTo(this.start.x, this.start.y)
        ctx.lineTo(this.end.x, this.end.y)
        ctx.strokeStyle = 'black'
        ctx.stroke()
    }
    wallUnit(){
        return this.end.subtract(this.start).unit()
    }
}

const left = 37
const up = 38
const right = 39
const down = 40

const keyControl = (b) => {
    canvas.addEventListener('keydown', (e) => {
        if(e.keyCode == left){
            LEFT = true
        }
        if(e.keyCode == up)
            UP = true
        if(e.keyCode == right)
            RIGHT = true
        if(e.keyCode == down)
            DOWN = true
    })
    
    canvas.addEventListener('keyup', (e) => {
        if(e.keyCode == left){
            LEFT = false
        }
        if(e.keyCode == up)
            UP = false
        if(e.keyCode == right)
            RIGHT = false
        if(e.keyCode == down)
            DOWN = false
    })

    if(LEFT){
        b.acc.x = -b.acceleration
    }
    if(UP){
        b.acc.y = -b.acceleration
    }
    if(RIGHT){
        b.acc.x = b.acceleration
    }
    if(DOWN){
        b.acc.y = b.acceleration
    }
    if(!UP && !DOWN) {
        b.acc.y = 0
    }
    if(!LEFT && !RIGHT) {
        b.acc.x = 0
    }
  
}

const round = (number, precision) => {
    let factor = 10 ** precision
    return Math.round(number * factor) / factor
}

const randInt = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

const closestPoint = (b, w) => {
    let ballToWallStart = w.start.subtract(b.pos)
    if(Vector.dot(w.wallUnit(), ballToWallStart) > 0)
        return w.start

    let ballToWallEnd = b.pos.subtract(w.end)
    if(Vector.dot(w.wallUnit(), ballToWallEnd) > 0)
        return w.end

    let closestDist = Vector.dot(w.wallUnit(), ballToWallStart)
    let closestVect = w.wallUnit().mul(closestDist)
    return w.start.subtract(closestVect)
}

const collissionDetection = (b1, b2) => {
    if(b1.rad + b2.rad >= b2.pos.subtract(b1.pos).mag()){
        return true
    }
        return false
}

const CollisionDetectionWall = (b, w) => {
    let ballToClosest = closestPoint(b, w).subtract(b.pos)
    if(ballToClosest.mag() <= b.rad)
        return true
}

const penetrationResolution = (b1, b2) => {
    let dist = b1.pos.subtract(b2.pos)
    let penDepth = b1.rad + b2.rad - dist.mag()
    let penRes = dist.unit().mul(penDepth / (b1.inv_m + b2.inv_m))
    b1.pos = b1.pos.add(penRes.mul(b1.inv_m))
    b2.pos = b2.pos.add(penRes.mul(-b2.inv_m))
}

const penetrationResolutionWall = (b, w) => {
    let penVect = b.pos.subtract(closestPoint(b, w))
    b.pos = b.pos.add(penVect.unit().mul(b.rad - penVect.mag()))
}

const collisionResponse = (b1, b2) => {
    let normal = b1.pos.subtract(b2.pos).unit()
    let relVel = b1.vel.subtract(b2.vel)
    let sepVel = Vector.dot(relVel, normal)
    let newSepVel = -sepVel * Math.min(b1.elasticity, b2.elasticity)

    let vsep_diff = newSepVel - sepVel
    let impulse = vsep_diff / (b1.inv_m + b2.inv_m)
    let impulseVec = normal.mul(impulse) 

    b1.vel = b1.vel.add(impulseVec.mul(b1.inv_m))
    b2.vel = b2.vel.add(impulseVec.mul(-b2.inv_m))
}

const collitionResponseWall = (b, w) => {
    let normal = b.pos.subtract(closestPoint(b, w)).unit()
    let sepVel = Vector.dot(b.vel, normal)
    let new_sepVel = -sepVel * b.elasticity
    let vsep_diff = sepVel - new_sepVel
    b.vel = b.vel.add(normal.mul(-vsep_diff))

    
}

const mainloop = () => {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    Balls.forEach((b, index) => {
        b.drawBall()
        if(b.isControlled == true) {
            keyControl(b)
        }
        Walls.forEach((w) => {
            if(CollisionDetectionWall(Balls[index], w)){
                penetrationResolutionWall(Balls[index], w)
                collitionResponseWall(Balls[index], w)
            }
        })
        for(let i = index + 1; i < Balls.length; i++){
            if(collissionDetection(Balls[index], Balls[i])){
                penetrationResolution(Balls[index], Balls[i])
                collisionResponse(Balls[index], Balls[i])
            }
        }
        b.display()
        b.reposition()
    })
    Walls.forEach((w) => {
        w.drawWall()
    })
        
    requestAnimationFrame(mainloop)
}

 for(let i = 0; i < 15; i++){
    let newBall = new Ball(randInt(100,500), randInt(40, 400), randInt(20,50),randInt(0, 10))
    newBall.elasticity = randInt(0,10) / 10
} 

let edge1 = new Wall(0 , 0, canvas.clientWidth, 0)
let edge2 = new Wall(canvas.clientWidth , 0, canvas.clientWidth, canvas.clientHeight)
let edge3 = new Wall(canvas.clientWidth , canvas.clientHeight, 0, canvas.clientHeight)
let edge4 = new Wall(0 , canvas.clientHeight, 0, 0)

Balls[0].isControlled = true

mainloop()