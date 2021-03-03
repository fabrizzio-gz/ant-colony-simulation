/* 
This is an attempt to simulate ant colony optimization using p5js.
Copyright (C) 2021 must-compute
<admin@must-compute.com>
Fabrizzio G. 
<onestepcode.web@gmail.com>

This softwareis free software: you can redistribute it and/or modify
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
const ANTS = 20;
const FOOD = 10;
const ANT_MEM = 5;
const OBSTACLE_COUNT = 10;
const OBSTACLE_SIZE = 5;
const PHEROMONE_CELLS_LIMIT = 5;
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
  world.render();
}

class World {
  constructor(
    initValues = {
      gridX: GRID_W,
      gridY: GRID_H,
      obstacleCount: OBSTACLE_COUNT,
      ants: ANTS,
      nestX: 25,
      nestY: 25,
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
  static stepDuration = Math.round(Math.max(GRID_W, GRID_H) * 10);

  constructor(x, y, steps = 0) {
    this.position = createVector(x, y);
    this.size = CELL_SIZE;
    this.type = "Cell"; // a hack because I don't know how to do pattern
    // matching on types in js yet (is it possible?)
    this.steps = steps;
    this.stepDuration = Cell.stepDuration;
  }

  addStepsRegion() {
    world.adjPos[this.position.x][this.position.y].forEach((position) => {
      const adjCell = world.grid[position.x][position.y];
      if (adjCell.type != "Pheromone") adjCell.addStep();
    });
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
    this.stepDuration--;
    if (Number.isNaN(this.stepDuration)) debugger;
    if (this.stepDuration < 0) this.decreaseSteps();
  }

  // For debugging purposes
  paintSpecial() {
    fill(0);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }

  render() {
    fill(48, 2, Math.max(98 - this.steps / 2, 20)); // Make darker with more steps
    // fill(48, 2, 98);
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
    fill(240, 100, 100); // Make darker with more steps
    // fill(48, 2, 98);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Ant extends Cell {
  static maxFuel = Math.max(GRID_W, GRID_H) * 1.5;

  constructor(x, y) {
    super(x, y);
    this.type = "Ant";
    this.state = RANDOM_WALK_MODE;
    this.prevPositions = [];
    this.fuel = Ant.maxFuel;
    this.nestProximity = Ant.maxFuel;
    this.penalty = 0;
  }

  update() {
    // Ants change `steps` property only when scavenging
    // Used to avoid ants looping while delivering food
    if (world.grid[this.position.x][this.position.y].type == "Nest")
      this.restoreNestProximity();
    this.nestProximity = Math.max(--this.nestProximity, 0);
    if (this.state === DELIVERY_MODE) {
      this.fuel--;
      this.deliver_food();
    } else if (this.state === SCAVENGER_MODE) {
      this.scavenge();
      if (world.grid[this.position.x][this.position.y].type != "Pheromone")
        world.grid[this.position.x][this.position.y].addStepsRegion();
    } else {
      this.randomWalk();
      // Add step to next cell
      // If ant has been away from nest too long,
      // it won't add steps
      if (this.penalty == 0 && this.nestProximity)
        world.grid[this.position.x][this.position.y].addStep(2);
    }
  }

  deliver_food() {
    const nextCell = this.getHighestStep();

    // if (!nextCell) debugger;
    if (nextCell.type == "Nest") {
      this.restoreFuel();
      this.prevPositions = [];
      this.state = SCAVENGER_MODE;
    }

    // Place pheromone before moving to next cell
    this.place_pheromone(this.position.x, this.position.y);
    // Save previous position and delete oldest one
    // if there are more than 3 positions saved
    if (
      this.prevPositions.unshift(
        createVector(this.position.x, this.position.y)
      ) > ANT_MEM
    )
      this.prevPositions.pop();
    this.position.x = nextCell.position.x;
    this.position.y = nextCell.position.y;
    if (this.fuel < 0 || this.pheromoneSurrounded()) this.failDelivery();
  }

  getHighestStep() {
    let x = this.position.x;
    let y = this.position.y;

    // Get the locations of nearby cells
    // Verify constraints later on.
    let nearby = world.adjPos[x][y];

    // Constrain options to only "Cell" or "Pheromones"
    // Filter previous cell (prevPosition)
    const nearbyCells = [];
    for (const position of nearby) {
      const cell = world.grid[position.x][position.y];
      if (
        (cell.type == "Cell" || cell.type == "Pheromone") &&
        !this.prevPositions.some(
          (prevPosition) =>
            cell.position.x == prevPosition.x &&
            cell.position.y == prevPosition.y
        )
      )
        nearbyCells.push(cell);
      else if (cell.type == "Nest") return cell;
    }

    // If the way in is the only way back
    if (!nearbyCells)
      nearbyCells.push(
        world.grid[this.prevPositions[0].x][this.prevPositions[0].y]
      );

    // Get the nearest cell with highest Step
    let max_step = random(nearbyCells);
    for (const cell of nearbyCells)
      if (cell.steps > max_step.steps) max_step = cell;

    return max_step;
  }

  pheromoneSurrounded() {
    const adjPos = world.adjPos[this.position.x][this.position.y];
    let pheromoneCellsCount = 0;
    adjPos.forEach((position) => {
      const cell = world.grid[position.x][position.y];
      if (cell.type == "Pheromone") pheromoneCellsCount++;
    });

    return pheromoneCellsCount >= PHEROMONE_CELLS_LIMIT;
  }

  failDelivery() {
    this.state = RANDOM_WALK_MODE;
    this.setPenalty();
    this.restoreFuel();
    this.prevPositions = [];
    // Make current position less appealing
    world.grid[this.position.x][this.position.y].steps = 0;
    // "Bomb surrounding possitions to avoid same path
    world.adjPos[this.position.x][this.position.y].forEach((position) => {
      const cell = world.grid[position.x][position.y];
      // Destroy surrounding pheromones
      if (cell.type == "Pheromone")
        world.grid[position.x][position.y] = new Cell(position.x, position.y);
    });
  }

  restoreFuel() {
    this.fuel = Ant.maxFuel;
  }

  restoreNestProximity(val = Ant.maxFuel) {
    this.nestProximity = val;
  }

  setPenalty() {
    this.penalty = Math.round(Ant.maxFuel / 2);
  }

  scavenge() {
    let min_pheromone = this.seek_pheromone();
    // move by 1 unit exactly in a random direction
    let new_x = min_pheromone.position.x;
    let new_y = min_pheromone.position.y;

    // Check collisions before moving
    let landed_on = world.grid[new_x][new_y]; // [Cell]

    if (landed_on.type == "Food") {
      this.state = DELIVERY_MODE;
      this.restoreNestProximity(Math.round(Ant.maxFuel / 2));
    } else if (landed_on.type == "Pheromone")
      // Consume pheromone (test without consuming too)
      world.grid[new_x][new_y] = new Cell(new_x, new_y, landed_on.steps);

    // Ant can only carry food when scavenging

    // Change the ant position
    // Don't save previous position when scavenging
    //this.prevPosition.x = this.position.x;
    // this.prevPosition.y = this.position.y;
    this.position.x = new_x;
    this.position.y = new_y;
  }

  place_pheromone(prev_x, prev_y) {
    if (world.grid[prev_x][prev_y].type != "Food")
      world.grid[prev_x][prev_y] = new Pheromone(
        prev_x,
        prev_y,
        world.grid[prev_x][prev_y].steps
      );
  }

  seek_pheromone() {
    let x = this.position.x;
    let y = this.position.y;

    // Get the locations of nearby cells
    let nearby = world.adjPos[x][y];

    // Get the min nearby pheromone
    let freshness =
      world.grid[this.position.x][this.position.y].freshness ?? 1000;
    let random_neighbor = random(nearby);
    let min_pheromone = world.grid[random_neighbor.x][random_neighbor.y];
    for (let i = 0; i < nearby.length; i++) {
      let nx = nearby[i].x;
      let ny = nearby[i].y;
      let cell = world.grid[nx][ny];
      if (cell.type === "Pheromone" || cell.type == "Food") {
        if (cell.freshness < freshness) {
          freshness = cell.freshness;
          min_pheromone = cell;
        }
      }
    }
    return min_pheromone;
  }

  randomWalk() {
    const nextPos = random(world.adjPos[this.position.x][this.position.y]);
    this.position.x = nextPos.x;
    this.position.y = nextPos.y;
    this.penalty = Math.max(this.penalty - 1, 0);
    if (this.penalty == 0) {
      const nextCell = world.grid[nextPos.x][nextPos.y];
      if (nextCell.type == "Pheromone" || nextCell.type == "Nest")
        this.state = SCAVENGER_MODE;
      else if (nextCell.type == "Food") this.state = DELIVERY_MODE;
    }
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
    this.freshness = 0; // To make ants choose it after pheromones
  }

  update() {}

  render() {
    fill(20, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Nest extends Cell {
  constructor(x, y) {
    super(x, y);
    this.type = "Nest";
    this.steps = 1000; // To make ants return to it
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
