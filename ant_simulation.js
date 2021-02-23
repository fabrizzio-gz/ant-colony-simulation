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
let grid = [];
const CELL_SIZE = 5;
const GRID_W = 100;
const GRID_H = 100;
const DELIVERY_MODE = "Delivery";
const SCAVENGER_MODE = "Scavenger";

let nest;

function setup() {
  createCanvas(700, 700);
  colorMode(HSB);
  strokeWeight(1);
  background(48, 2, 98);
  stroke(0, 0, 80);

  // Initialize grid with empty cells
  for (let x = 0; x < GRID_W; x++) {
    grid.push([]); // add cols
    for (let y = 0; y < GRID_H; y++) {
      grid[x][y] = new Cell(x, y);
    }
  }

  // Add ants
  for (let x = 0; x < GRID_W - 20; x += 5) {
    grid.push([]); // add cols
    for (let y = 0; y < GRID_H - 80; y += 5) {
      grid[x][y] = new Ant(x, y);
    }
  }

  // Add food
  for (let x = 80; x < GRID_W; x += 1) {
    grid.push([]); // add cols
    for (let y = 80; y < GRID_H; y += 1) {
      grid[x][y] = new Food(x, y);
    }
  }

  // Add nest
  nest = new Nest(3, 3);
  grid[3][3] = nest;
}

class Cell {
  constructor(x, y) {
    this.position = createVector(x, y);
    this.size = CELL_SIZE;
    this.type = "Cell"; // a hack because I don't know how to do pattern
    // matching on types in js yet (is it possible?)
  }

  update() {}

  render() {
    noFill();
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
    if (this.state === DELIVERY_MODE) {
      this.deliver_food();
    } else if (this.state === SCAVENGER_MODE) {
      this.scavenge();
    }
  }

  deliver_food() {
    let new_x = this.position.x;
    let new_y = this.position.y;

    if (this.position.x < nest.position.x) {
      new_x = this.position.x + 1;
    } else if (this.position.x > nest.position.x) {
      new_x = this.position.x - 1;
    }

    if (this.position.y < nest.position.y) {
      new_y = this.position.y + 1;
    } else if (this.position.y > nest.position.y) {
      new_y = this.position.y - 1;
    }

    let prev_x = this.position.x;
    let prev_y = this.position.y;

    new_x = constrain(new_x, 0, GRID_W - 1);
    new_y = constrain(new_y, 0, GRID_H - 1);

    // Check collisions before moving
    let landed_on = grid[new_x][new_y];

    if (landed_on.type == "Nest") {
      this.state = SCAVENGER_MODE;
    }

    this.position.x = new_x;
    this.position.y = new_y;

    // Place pheromone on the previous position only if the ant isn't still
    // on that position.
    if (!(prev_x === new_x && prev_y === new_y)) {
      this.place_pheromone(prev_x, prev_y);
    }
  }

  scavenge() {
    let max_pheromone = this.seek_pheromone();
    // move by 1 unit exactly in a random direction
    let new_x = max_pheromone.position.x;
    let new_y = max_pheromone.position.y;

    new_x = constrain(new_x, 0, GRID_W - 1);
    new_y = constrain(new_y, 0, GRID_H - 1);

    // Check collisions before moving
    let landed_on = grid[new_x][new_y]; // [Cell]

    for (let c = 0; c < landed_on.length; c++) {
      if (landed_on[c].type == "Food") {
        this.state = DELIVERY_MODE;

        // Remove food cell
        grid[new_x][new_y] = new Cell(new_x, new_y);
      } else if (landed_on.type == "Pheromone") {
        // Consume pheromone
        grid[new_x][new_y] = new Cell(new_x, new_y);
      } else if (landed_on.type == "Ant") {
      }
    }

    // Ant can only carry food when scavenging

    // Change the ant position
    this.position.x = new_x;
    this.position.y = new_y;
  }

  place_pheromone(prev_x, prev_y) {
    grid[prev_x][prev_y] = new Pheromone(prev_x, prev_y);
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

    // Get the max nearby pheromone
    let freshness = 0;
    let random_neighbor = random(nearby);
    let max_pheromone = grid[random_neighbor.x][random_neighbor.y];
    for (let i = 0; i < nearby.length; i++) {
      let nx = nearby[i].x;
      let ny = nearby[i].y;
      let cell = grid[nx][ny];
      if (cell.type === "Pheromone") {
        if (cell.freshness > freshness) {
          freshness = cell.freshness;
          max_pheromone = cell;
        }
      }
    }
    return max_pheromone;
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
    this.freshness = 50;
  }

  update() {
    // If the pheromone is depleted, clear this grid cell.
    if (this.freshness === 0) {
      grid[this.position.x][this.position.y] = new Cell(
        this.position.x,
        this.position.y
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
  background(48, 2, 98);

  // update then render each grid item
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < grid[x].length; y++) {
      grid[x][y].update();
      grid[x][y].render();
    }
  }
}
