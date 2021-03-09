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
// import { World, Obstacle, Ant, Cell, Food, Nest } from "classes";

// globals and settings
let world;
const CELL_SIZE = 9;
const GRID_W = 50;
const GRID_H = 50;
const NEST_X = 25;
const NEST_Y = 25;
const ANTS = 10;
const FOOD = 50;
const FOOD_STOCK = 10;
const OBSTACLE_COUNT = 10;
const OBSTACLE_SIZE = 5;
const DELIVERY_MODE = "Delivery";
const SCAVENGER_MODE = "Scavenger";

function setup() {
  const canvas = createCanvas(GRID_W * CELL_SIZE, GRID_H * CELL_SIZE);
  canvas.parent("canvas-container");
  document.getElementById("canvas-container").style.width =
    GRID_W * CELL_SIZE + "px";
  document.getElementById("canvas-container").style.height =
    GRID_H * CELL_SIZE + "px";

  frameRate(10);

  colorMode(HSB);
  // background(48, 2, 98);
  background(0, 0, 100);
  strokeWeight(0);

  world = createWorld();
  world.render();
}

function draw() {
  world.update();
  world.render();
}

// Button onclick functions
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
  world = createWorld();
};

const createWorld = () => {
  let newWorld;
  // Create new world and check the nest isn't trapped
  // between obstacles. Else recreate world
  do newWorld = new World();
  while (
    newWorld.adjPos[newWorld.nest.position.x][newWorld.nest.position.y]
      .length == 0
  );

  return newWorld;
};

const step = () => {
  if (isLooping()) noLoop();
  draw();
};
