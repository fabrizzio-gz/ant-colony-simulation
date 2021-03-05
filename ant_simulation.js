/*
This is an attempt to simulate ant colony optimization using p5js.
Copyright (C) 2021 must-compute <admin@must-compute.com>
Copyright (C) 2021 Fabrizzio G. <onestepcode.web@gmail.com>: Forked initial implementation from must-compute.

This software is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
This software is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.
You should have received a copy of the GNU Affero General Public License
along with this software.  If not, see <https://www.gnu.org/licenses/>.
*/

// globals and settings
let world;
const CELL_SIZE = 5;
const GRID_W = 50;
const GRID_H = 50;
const NEST_X = 25;
const NEST_Y = 25;
const ANTS = 10;
const FOOD = 50;
const FOOD_STOCK = 10;
const ANT_MEM = 0;
const OBSTACLE_COUNT = 0;
const OBSTACLE_SIZE = 5;
const PHEROMONE_CELLS_LIMIT = 0;
const RANDOM_WALK_MODE = "Random";
const DELIVERY_MODE = "Delivery";
const SCAVENGER_MODE = "Scavenger";

function setup() {
  createCanvas(500, 500);
  frameRate(10);

  // Set up buttons to control simulation
  const slowButton = createButton("slow");
  const normalButton = createButton("normal");
  const fastButton = createButton("fast");
  const resetButton = createButton("reset");
  const toggleButton = createButton("toggle");
  const ffButton = createButton("ff");
  const stepButton = createButton("step");

  slowButton.position(20, GRID_H * CELL_SIZE + 20);
  normalButton.position(100, GRID_H * CELL_SIZE + 20);
  fastButton.position(200, GRID_H * CELL_SIZE + 20);
  resetButton.position(20, GRID_H * CELL_SIZE + 50);
  toggleButton.position(100, GRID_H * CELL_SIZE + 50);
  ffButton.position(200, GRID_H * CELL_SIZE + 50);
  stepButton.position(100, GRID_H * CELL_SIZE + 80);

  slowButton.mousePressed(slow);
  normalButton.mousePressed(normal);
  fastButton.mousePressed(fast);
  resetButton.mousePressed(reset);
  toggleButton.mousePressed(toggle);
  ffButton.mousePressed(ff);
  stepButton.mousePressed(step);

  colorMode(HSB);
  strokeWeight(1);
  background(48, 2, 98);
  stroke(0, 0, 80);

  world = new World();

  // Set a trail of food (debugging only)
  // for (let i = 1; i < 20; i++) world.grid[25][25 + i].foodDistance = 100 - i;

  world.render();
}

class World {
  constructor(
    initValues = {
      gridX: GRID_W,
      gridY: GRID_H,
      obstacleCount: OBSTACLE_COUNT,
      ants: ANTS,
      nestX: NEST_X,
      nestY: NEST_Y,
      food: FOOD,
    }
  ) {
    const {
      gridX,
      gridY,
      obstacleCount,
      ants,
      nestX,
      nestY,
      food,
    } = initValues;
    this.gridX = gridX;
    this.gridY = gridY;
    this.grid = this.initGrid();
    this.nest = this.initNest(nestX, nestY);
    this.adjPos = this.getAdjPositions();
    this.addObstacles(obstacleCount);
    if (food) this.initFood(food, this.grid);
    // Needs to calculate adj positions again
    // after adding obstacles
    this.adjPos = this.getAdjPositions();
    this.ants = this.initAnts(ants);
  }

  initGrid() {
    const grid = [];
    for (let x = 0; x < this.gridX; x++) {
      grid.push([]); // add cols
      for (let y = 0; y < this.gridY; y++) grid[x][y] = new Cell(x, y);
    }

    return grid;
  }

  addObstacles(quantity) {
    while (quantity--) {
      let x = Math.floor(Math.random() * this.gridX);
      let y = Math.floor(Math.random() * this.gridY);
      let expansions = OBSTACLE_SIZE;
      do {
        this.grid[x][y].createObstacle(this);
        this.adjPos[x][y].forEach((position) => {
          if (this.grid[position.x][position.y].type != "Nest")
            this.grid[position.x][position.y] = new Obstacle(
              position.x,
              position.y
            );
        }, this);
        let nextPos = random(this.adjPos[x][y]);
        x = nextPos.x;
        y = nextPos.y;
      } while (expansions--);
    }
  }

  getAdjPositions() {
    const adjPos = [];
    for (let x = 0; x < this.gridX; x++) {
      adjPos.push([]);
      for (let y = 0; y < this.gridY; y++) {
        const neighbours = this.getNeighbours(x, y);
        adjPos[x][y] = [];
        neighbours.forEach((position) => {
          // Invalid cells will be `undefined` (falsy)
          try {
            const cell = this.grid[position.x][position.y];
            if (cell.type != "Obstacle") adjPos[x][y].push(position);
          } catch (error) {
            // TypeError due to index out of grid (ok)
            if (!(error instanceof TypeError)) throw error;
          }
        }, this);
      }
    }

    return adjPos;
  }

  getNeighbours(x, y) {
    return [
      createVector(x - 1, y - 1),
      createVector(x, y - 1),
      createVector(x + 1, y - 1),

      createVector(x - 1, y),
      createVector(x + 1, y),

      createVector(x - 1, y + 1),
      createVector(x, y + 1),
      createVector(x + 1, y + 1),
    ];
  }

  initNest(nestX, nestY) {
    const nest = new Nest(nestX, nestY);
    this.grid[nestX][nestY] = nest;
    return nest;
  }

  initAnts(ants) {
    const antsArray = [];
    for (; ants; )
      for (; ants; ants--)
        antsArray.push(new Ant(this.nest.position.x, this.nest.position.y));

    return antsArray;
  }

  initFood(food) {
    /*
    for (let x = this.gridX - 1; x >= this.gridX - food; x--)
      for (let y = this.gridY - 1; y >= this.gridY - food; y--)
        this.grid[x][y] = new Food(x, y);
    */
    // Create food at random positions
    while (food--) {
      const x = Math.floor(Math.random() * this.gridX);
      const y = Math.floor(Math.random() * this.gridY);
      if (!(x == this.nest.position.x && y == this.nest.position.y))
        this.grid[x][y] = new Food(x, y);
      // Didn't add food this round, increase food
      else food++;
    }
  }

  // For debugging purposes
  printSteps(toPrint = "nest") {
    if (toPrint == "nest") {
      console.log("Distance from nest");
      for (let y = 0; y < this.gridY; y++) {
        let distance = "";
        for (let x = 0; x < this.gridX; x++)
          if (x == this.nest.position.x && y == this.nest.position.y)
            distance += "x|";
          else
            distance +=
              this.grid[x][y].nestDistance == Number.MAX_SAFE_INTEGER
                ? "-|"
                : this.grid[x][y].nestDistance + "|";
        console.log(distance);
      }
    } else {
      console.log("Distance from food sources");
      for (let y = 0; y < this.gridY; y++) {
        let distance = "";
        for (let x = 0; x < this.gridX; x++)
          if (x == this.nest.position.x && y == this.nest.position.y)
            distance += "x|";
          else
            distance +=
              this.grid[x][y].foodDistance == -1
                ? "-|"
                : this.grid[x][y].foodDistance + "|";
        console.log(distance);
      }
    }
  }

  update() {
    for (let x = 0; x < this.gridX; x++)
      for (let y = 0; y < this.gridY; y++) this.grid[x][y].update();

    this.ants.forEach((ant) => ant.update());
  }

  render() {
    for (let x = 0; x < this.gridX; x++)
      for (let y = 0; y < this.gridY; y++) this.grid[x][y].render();
    this.ants.forEach((ant) => ant.render());
    // Always render nest on top
    this.nest.render();
  }
}

class Cell {
  static stepDuration = Math.max(GRID_W, GRID_H) * 5;
  // Maximum food distance duration
  static foodMaxD = Math.max(GRID_W, GRID_H) * 1.5;

  constructor(x, y, steps = 0) {
    this.position = createVector(x, y);
    this.size = CELL_SIZE;
    this.type = "Cell";
    this.nestDistance = Number.MAX_SAFE_INTEGER;
    this.foodDistance = -1;
    this.fDuration = 0; // food distance duration
    this.steps = steps;
    // this.foodProximity = 0 TODO
    // this.stepDuration = Cell.stepDuration;
  }

  setCellsNestDistance(stepsFromNest) {
    this.setCellsDistance(stepsFromNest, "nest");
  }

  setFoodDistance(stepsFromFood) {
    this.setDistance(stepsFromFood, "food");
    this.fDuration = Cell.foodMaxD;
    // Never set nest value
    world.nest.foodDistance = -1;
  }

  setCellsDistance(steps, property) {
    this.setDistance(steps, property);

    world.adjPos[this.position.x][this.position.y].forEach((position) => {
      // Increase cells in same x or y index by +1
      if (position.x == this.position.x || position.y == this.position.y)
        world.grid[position.x][position.y].setDistance(steps + 1, property);
      // Diagonal values, increase by +2
      else world.grid[position.x][position.y].setDistance(steps + 2, property);
    }, this);
  }

  setDistance(steps, property) {
    if (property == "nest") {
      if (this.nestDistance > steps) this.nestDistance = steps;
    } else {
      // property == "food"
      if (this.foodDistance == -1) this.foodDistance = steps;
      else if (this.foodDistance > steps) this.foodDistance = steps;
    }
  }

  eraseFoodTrail() {
    this.fDuration = 0;
  }

  stepOnCell() {
    this.addStep();
  }

  addStep(n = 1) {
    // Reset decrease count
    this.stepDuration = Cell.stepDuration;
    this.steps += n;
  }

  decreaseSteps() {
    this.steps--;
  }

  createObstacle(world) {
    if (
      !(
        this.position.x == world.nest.position.x &&
        this.position.y == world.nest.position.y
      )
    )
      world.grid[this.position.x][this.position.y] = new Obstacle(
        this.position.x,
        this.position.y
      );
  }

  update() {
    this.updateSteps();
    this.fDuration = Math.max(--this.fDuration, 0);
    // Reset when duration passes
    if (this.fDuration == 0) this.foodDistance = -1;
  }

  updateSteps() {
    this.stepDuration--;
    if (this.stepDuration < 0) this.decreaseSteps();
  }

  // For debugging purposes
  paintSpecial() {
    fill(0);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }

  render() {
    if (this.fDuration == 0) fill(48, 2, Math.min(this.nestDistance, 255));
    else fill(50, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Obstacle extends Cell {
  constructor(x, y) {
    super(x, y);
    this.type = "Obstacle";
  }

  update() {}

  render() {
    fill(240, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Ant extends Cell {
  static maxFuel = Math.max(GRID_W, GRID_H) * 1.5;

  constructor(x, y) {
    super(x, y);
    this.type = "Ant";
    this.state = SCAVENGER_MODE;
    // this.fuel = Ant.maxFuel;
    this.stepsFromNest = 0;
    this.stepsFromFood = -1;
    this.erase = false;
    this.prevPosition = createVector(-1, -1);
    // this.penalty = 0;
  }

  update() {
    if (world.grid[this.position.x][this.position.y].type == "Nest")
      this.reachedNest();

    if (world.grid[this.position.x][this.position.y].type == "Food")
      this.reachedFood();

    // Update current cell steps count
    getCell(this.position).stepOnCell();

    this.stepsFromNest++;
    if (this.stepsFromFood >= 0) this.stepsFromFood++;

    // Getting new position
    let newPos;
    if (this.state == SCAVENGER_MODE) {
      // Try getting food trail, else move randomly
      // If initial position is the nest, then move randomly
      if (
        this.isCloseToNest() ||
        !(newPos = this.getMinDistanceFood()) ||
        isSamePosition(newPos, this.prevPosition)
      )
        do newPos = this.randomWalk();
        while (isSamePosition(newPos, this.prevPosition));
    }
    // DELIVERY_MODE
    else {
      newPos = this.getMinNestDistanceCell();
      if (this.erase) getCell(this.position).eraseFoodTrail();
    }

    if (this.isDiagonal(newPos)) {
      this.stepsFromNest++;
      if (this.stepsFromFood >= 0) this.stepsFromFood++;
    }

    this.saveOldPosition();
    this.updatePosition(newPos);

    if (this.state == SCAVENGER_MODE) this.updateNestDistance();
    // DELIVERY_MODE
    else if (this.stepsFromFood != -1)
      getCell(this.position).setFoodDistance(this.stepsFromFood);
    // TODO update prevPositions
  }

  getMinDistanceFood() {
    const initialDistance =
      getCell(this.position).foodDistance == -1
        ? Number.MAX_SAFE_INTEGER
        : getCell(this.position).foodDistance;
    // Return a cell with less food distance, undefined if none
    const newPos = world.adjPos[this.position.x][this.position.y].reduce(
      (foodPos, nextPos) => {
        // If nextPos doesn't have a valid value, skip
        if (world.grid[nextPos.x][nextPos.y].foodDistance == -1) return foodPos;
        // If current foodPos isn't set ( == -1) but next is set
        if (world.grid[foodPos.x][foodPos.y].foodDistance == -1) return nextPos;
        // If nextPos is a valid value, update to min
        if (
          world.grid[foodPos.x][foodPos.y].foodDistance != -1 &&
          world.grid[nextPos.x][nextPos.y].foodDistance <
            world.grid[foodPos.x][foodPos.y].foodDistance
        )
          return nextPos;
        return foodPos;
      }
    );

    // If no improvement, abort
    if (getCell(newPos).foodDistance >= initialDistance) return undefined;

    // Return newPos if it has a valid foodDistance value
    if (world.grid[newPos.x][newPos.y].foodDistance != -1) return newPos;
    return undefined;
  }

  getMinNestDistanceCell() {
    const nextPos = world.adjPos[this.position.x][this.position.y].reduce(
      (minPos, nextPos) => {
        if (
          world.grid[nextPos.x][nextPos.y].nestDistance <
          world.grid[minPos.x][minPos.y].nestDistance
        )
          return nextPos;
        return minPos;
      }
    );
    return nextPos;
  }

  randomWalk() {
    return random(world.adjPos[this.position.x][this.position.y]);
  }

  isCloseToNest() {
    return isSamePosition(this.position, world.nest.position);
  }

  startEraseFoodTrail() {
    this.erase = true;
  }

  saveOldPosition() {
    this.prevPosition.x = this.position.x;
    this.prevPosition.y = this.position.y;
  }

  updatePosition(newPos) {
    this.position.x = newPos.x;
    this.position.y = newPos.y;
  }

  updateNestDistance() {
    if (this.stepsFromNest > getCell(this.position).nestDistance)
      // Update ant distance to cell stored value
      this.stepsFromNest = getCell(this.position).nestDistance;
    // Update cells with ant's new closest distance
    else getCell(this.position).setCellsNestDistance(this.stepsFromNest);
  }

  isDiagonal(newPos) {
    return !(this.position.x == newPos.x || this.position.y == newPos.y);
  }

  reachedFood() {
    this.stepsFromFood = 0;
    getCell(this.position).eatFood();
    if (getCell(this.position).foodLeft <= 0) this.startEraseFoodTrail();
    this.state = DELIVERY_MODE;
  }

  reachedNest() {
    this.stepsFromNest = 0;
    this.stepsFromFood = -1;
    this.resetPrevPosition();
    this.state = SCAVENGER_MODE;
    this.erase = false;
  }

  resetPrevPosition() {
    this.prevPosition.x = world.nest.position.x;
    this.prevPosition.y = world.nest.position.y;
  }

  // For debugging
  return() {
    this.state = DELIVERY_MODE;
  }

  render() {
    if (this.state === SCAVENGER_MODE || this.state == RANDOM_WALK_MODE) {
      fill(100, 100, 70);
    } else {
      fill(20, 80, 80);
    }
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Food extends Cell {
  constructor(x, y) {
    super(x, y);
    this.type = "Food";
    this.foodDistance = 0;
    this.foodLeft = FOOD_STOCK;
  }

  eatFood() {
    this.foodLeft--;
  }

  update() {
    if (this.foodLeft <= 0)
      world.grid[this.position.x][this.position.y] = new Cell(
        this.position.x,
        this.position.y
      );
  }

  render() {
    fill(20, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Nest extends Cell {
  constructor(x, y) {
    super(x, y);
    this.type = "Nest";
    this.nestDistance = 0;
  }

  setNestDistance(stepsFromNest) {
    // Never set nest distance to nest
  }

  stepOnCell() {
    // Do not increase Nest steps
  }

  update() {}

  render() {
    fill(100, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Pheromone extends Cell {
  static maxFreshness = Math.max(GRID_H, GRID_W) * 2;

  constructor(x, y, steps) {
    super(x, y, steps);
    this.type = "Pheromone";
    this.freshness = Pheromone.maxFreshness;
  }

  update() {
    // If the pheromone is depleted, clear this world.grid cell.
    if (this.freshness === 0) {
      world.grid[this.position.x][this.position.y] = new Cell(
        this.position.x,
        this.position.y,
        this.steps
      );
    } else {
      this.freshness -= 1;
    }
  }

  render() {
    fill(50, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

function draw() {
  world.update();
  world.render();
}

const getCell = (position) => world.grid[position.x][position.y];

const isSamePosition = (pos1, pos2) => pos1.x == pos2.x && pos1.y == pos2.y;

// fast-forward
const ff = () => {
  for (let i = 0; i < 1000; i++) world.update();
};

const fast = () => {
  frameRate(20);
};

const slow = () => {
  frameRate(5);
};

const normal = () => {
  frameRate(10);
};

const toggle = () => {
  if (isLooping()) noLoop();
  else loop();
};

const reset = () => {
  world = new World();
};

const step = () => {
  if (isLooping()) noLoop();
  draw();
};
