/* 
This is an attempt to simulate ant colony optimization using p5js.
Copyright (C) 2021 must-compute
<admin@must-compute.com>

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

// globals
let world;
let stop = false;
let slow = false;
let slowCounter = 0;
const CELL_SIZE = 5;
const GRID_W = 100;
const GRID_H = 100;
const DELIVERY_MODE = "Delivery";
const SCAVENGER_MODE = "Scavenger";

function setup() {
  createCanvas(700, 700);
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
      ants: 50,
      nestX: 50,
      nestY: 50,
      food: 40,
    }
  ) {
    const { gridX, gridY, ants, nestX, nestY, food } = initValues;
    this.gridX = gridX;
    this.gridY = gridY;
    this.grid = this.initGrid(gridX, gridY);
    this.nest = this.initNest(nestX, nestY);
    if (food) this.initFood(food, this.grid);
    this.ants = this.initAnts(ants);
  }

  initGrid(gridX, gridY) {
    const grid = [];
    for (let x = 0; x < gridX; x++) {
      grid.push([]); // add cols
      for (let y = 0; y < gridY; y++) grid[x][y] = new Cell(x, y);
    }

    return grid;
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
    for (let x = this.gridX - 1; x >= this.gridX - food; x--)
      for (let y = this.gridY - 1; y >= this.gridY - food; y--)
        this.grid[x][y] = new Food(x, y);
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
  constructor(x, y, steps = 0) {
    this.position = createVector(x, y);
    this.size = CELL_SIZE;
    this.type = "Cell"; // a hack because I don't know how to do pattern
    // matching on types in js yet (is it possible?)
    this.steps = steps;
  }

  addStep() {
    this.steps++;
  }
  update() {}

  render() {
    fill(48, 2, Math.max(98 - this.steps, 20)); // Make darker with more steps
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Ant extends Cell {
  constructor(x, y) {
    super(x, y);
    this.type = "Ant";
    this.state = SCAVENGER_MODE;
    this.next_position = createVector(x, y); // TODO
  }

  update() {
    world.grid[this.position.x][this.position.y].addStep();
    if (this.state === DELIVERY_MODE) {
      this.deliver_food();
    } else if (this.state === SCAVENGER_MODE) {
      this.scavenge();
    }
  }

  deliver_food() {
    const prev_x = this.position.x;
    const prev_y = this.position.y;
    const nextCell = this.getHighestStep();
    /*
    let new_x = this.position.x;
    let new_y = this.position.y;

    if (this.position.x < world.nest.position.x) {
      new_x = this.position.x + 1;
    } else if (this.position.x > world.nest.position.x) {
      new_x = this.position.x - 1;
    }

    if (this.position.y < world.nest.position.y) {
      new_y = this.position.y + 1;
    } else if (this.position.y > world.nest.position.y) {
      new_y = this.position.y - 1;
    }

    let prev_x = this.position.x;
    let prev_y = this.position.y;

    
    new_x = constrain(new_x, 0, GRID_W - 1);
    new_y = constrain(new_y, 0, GRID_H - 1);

    // Check collisions before moving
    let landed_on = world.grid[new_x][new_y];
    */
    if (nextCell.type == "Nest") {
      this.state = SCAVENGER_MODE;
    }

    this.position.x = nextCell.position.x;
    this.position.y = nextCell.position.y;

    // Place pheromone on the previous position only if the ant isn't still
    // on that position.
    if (!(prev_x === this.position.x && prev_y === this.position.y))
      this.place_pheromone(prev_x, prev_y);
  }

  getHighestStep() {
    let x = this.position.x;
    let y = this.position.y;

    // Get the locations of nearby cells
    // Verify constraints later on.
    let nearby = [
      createVector(x - 1, y - 1),
      createVector(x, y - 1),
      createVector(x + 1, y - 1),

      createVector(x - 1, y),
      createVector(x + 1, y),

      createVector(x - 1, y + 1),
      createVector(x, y + 1),
      createVector(x + 1, y + 1),
    ];

    // Constrain locations within the canvas
    // subtract 1 because of inclusive `constrain`
    // (we want from: inclusive, to: exclusive)
    for (let i = 0; i < nearby.length; i++) {
      nearby[i].x = constrain(nearby[i].x, 0, GRID_W - 1);
      nearby[i].y = constrain(nearby[i].y, 0, GRID_H - 1);
    }

    // Constrain to only "Cell" or "Pheromones"
    const nearbyCells = [];
    for (let i = 0; i < nearby.length; i++)
      if (
        ["Cell", "Pheromone"].includes(
          world.grid[nearby[i].x][nearby[i].y].type
        )
      )
        nearbyCells.push(world.grid[nearby[i].x][nearby[i].y]);
      else if (world.grid[nearby[i].x][nearby[i].y].type == "Nest")
        // Go back to nest as soon as it's found
        return world.grid[nearby[i].x][nearby[i].y];

    // debugger;
    // Get the nearest cell with highest Step
    let max_step = random(nearbyCells);
    for (const cell of nearbyCells)
      if (cell.steps > max_step.steps) max_step = cell;

    return max_step;
  }

  scavenge() {
    let min_pheromone = this.seek_pheromone();
    // move by 1 unit exactly in a random direction
    let new_x = min_pheromone.position.x;
    let new_y = min_pheromone.position.y;

    new_x = constrain(new_x, 0, GRID_W - 1);
    new_y = constrain(new_y, 0, GRID_H - 1);

    // Check collisions before moving
    let landed_on = world.grid[new_x][new_y]; // [Cell]

    if (landed_on.type == "Food") {
      this.state = DELIVERY_MODE;

      // Remove food cell
      world.grid[new_x][new_y] = new Cell(new_x, new_y);
    } else if (landed_on.type == "Pheromone") {
      // Don't consume pheromone
      // world.grid[new_x][new_y] = new Cell(new_x, new_y);
    }

    // Ant can only carry food when scavenging

    // Change the ant position
    this.position.x = new_x;
    this.position.y = new_y;
  }

  place_pheromone(prev_x, prev_y) {
    world.grid[prev_x][prev_y] = new Pheromone(prev_x, prev_y);
  }

  seek_pheromone() {
    let x = this.position.x;
    let y = this.position.y;

    // Get the locations of nearby cells
    let nearby = [
      createVector(x - 1, y - 1),
      createVector(x, y - 1),
      createVector(x + 1, y - 1),

      createVector(x - 1, y),
      createVector(x + 1, y),

      createVector(x - 1, y + 1),
      createVector(x, y + 1),
      createVector(x + 1, y + 1),
    ];

    // Constrain locations within the canvas
    // subtract 1 because of inclusive `constrain`
    // (we want from: inclusive, to: exclusive)
    for (let i = 0; i < nearby.length; i++) {
      nearby[i].x = constrain(nearby[i].x, 0, GRID_W - 1);
      nearby[i].y = constrain(nearby[i].y, 0, GRID_H - 1);
    }

    // Get the min nearby pheromone
    let freshness = 1000;
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

  render() {
    if (this.state === SCAVENGER_MODE) {
      fill(0);
    } else {
      fill(20, 100, 100);
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
    fill(90, 100, 100);
    square(this.position.x * this.size, this.position.y * this.size, this.size);
  }
}

class Pheromone extends Cell {
  constructor(x, y) {
    super(x, y);
    this.type = "Pheromone";
    this.freshness = world.gridX + world.gridY;
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
  if (stop) return;
  world.update();
  world.render();
}

// fast-forward
const ff = () => {
  for (let i = 0; i < 1000; i++) world.update();
};

// stop simulation
const s = () => {
  stop = true;
};

// resume simulation
const r = () => {
  stop = false;
};
