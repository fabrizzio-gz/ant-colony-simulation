class World {
    constructor(initValues = {
        gridX: GRID_W,
        gridY: GRID_H,
        obstacleCount: OBSTACLE_COUNT,
        ants: ANTS,
        nestX: NEST_X,
        nestY: NEST_Y,
        food: FOOD,
    }) {
        const { gridX, gridY, obstacleCount, ants, nestX, nestY, food, } = initValues;
        this.gridX = gridX;
        this.gridY = gridY;
        this.grid = this.initGrid();
        this.nest = this.initNest(nestX, nestY);
        this.adjPos = this.getAdjPositions();
        this.addObstacles(obstacleCount);
        if (food)
            this.initFood(food);
        // Needs to calculate adj positions again
        // after adding obstacles
        this.adjPos = this.getAdjPositions();
        this.ants = this.initAnts(ants);
        this.renderAllOnce();
    }
    initGrid() {
        const grid = [];
        for (let x = 0; x < this.gridX; x++) {
            grid.push([]); // add cols
            for (let y = 0; y < this.gridY; y++)
                grid[x][y] = new Cell(x, y);
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
                        this.grid[position.x][position.y] = new Obstacle(position.x, position.y);
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
                        if (cell.type != "Obstacle")
                            adjPos[x][y].push(position);
                    }
                    catch (error) {
                        // TypeError due to index out of grid (ok)
                        if (!(error instanceof TypeError))
                            throw error;
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
        for (; ants;)
            for (; ants; ants--)
                antsArray.push(new Ant(this.nest.position.x, this.nest.position.y));
        return antsArray;
    }
    initFood(food) {
        // Create food at random positions
        while (food--) {
            const x = Math.floor(Math.random() * this.gridX);
            const y = Math.floor(Math.random() * this.gridY);
            if (!(x == this.nest.position.x && y == this.nest.position.y))
                this.grid[x][y] = new Food(x, y);
            // Didn't add food this round, increase food
            else
                food++;
        }
    }
    // For debugging purposes (needs type checking)
    /*
    printSteps(toPrint: string = "nest") {
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
    } */
    update() {
        for (let x = 0; x < this.gridX; x++)
            for (let y = 0; y < this.gridY; y++)
                this.grid[x][y].update();
        this.ants.forEach((ant) => ant.update());
    }
    renderAllOnce() {
        for (let x = 0; x < this.gridX; x++)
            for (let y = 0; y < this.gridY; y++)
                this.grid[x][y].render();
    }
    render() {
        // Obstacles aren't rendered
        for (let x = 0; x < this.gridX; x++)
            for (let y = 0; y < this.gridY; y++)
                if (this.grid[x][y].type != "Obstacle")
                    this.grid[x][y].render();
        this.ants.forEach((ant) => ant.render());
        // Always render nest on top
        this.nest.render();
    }
}
class Obstacle {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.size = CELL_SIZE;
        this.type = "Obstacle";
    }
    createObstacle(world) {
        if (!(this.position.x == world.nest.position.x &&
            this.position.y == world.nest.position.y))
            world.grid[this.position.x][this.position.y] = new Obstacle(this.position.x, this.position.y);
    }
    update() { }
    render() {
        fill(240, 100, 100);
        square(this.position.x * this.size, this.position.y * this.size, this.size);
    }
}
class Ant extends Obstacle {
    constructor(x, y) {
        super(x, y);
        //this.position = createVector(x, y);
        // this.size = CELL_SIZE;
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
        // Ants change `steps` property only when scavenging
        // Used to avoid ants looping while delivering food
        if (world.grid[this.position.x][this.position.y].type == "Nest")
            this.reachedNest();
        if (world.grid[this.position.x][this.position.y].type == "Food")
            this.reachedFood();
        // Update current cell steps count
        getCell(this.position).stepOnCell();
        this.stepsFromNest++;
        if (this.stepsFromFood >= 0)
            this.stepsFromFood++;
        // Getting new position
        let newPos;
        if (this.state == SCAVENGER_MODE) {
            // Try getting food trail, else move randomly
            // If initial position is the nest, then move randomly
            if (this.isCloseToNest() ||
                !(newPos = this.getMinDistanceFood()) ||
                isSamePosition(newPos, this.prevPosition))
                do
                    newPos = this.randomWalk();
                while (
                // Get a random new position that is not the
                // previous one. Unless that's the only one
                getAdjCellPos(this.position).length != 1 &&
                    isSamePosition(newPos, this.prevPosition));
        }
        // DELIVERY_MODE
        else {
            newPos = this.getMinNestDistanceCell();
            if (this.erase)
                getCell(this.position).eraseFoodTrail();
        }
        if (this.isDiagonal(newPos)) {
            this.stepsFromNest++;
            if (this.stepsFromFood >= 0)
                this.stepsFromFood++;
        }
        this.saveOldPosition();
        this.updatePosition(newPos);
        if (this.state == SCAVENGER_MODE)
            this.updateNestDistance();
        // DELIVERY_MODE
        else if (this.stepsFromFood != -1)
            getCell(this.position).setFoodDistance(this.stepsFromFood);
        // TODO update prevPositions
    }
    getMinDistanceFood() {
        const initialDistance = getCell(this.position).foodDistance == -1
            ? Number.MAX_SAFE_INTEGER
            : getCell(this.position).foodDistance;
        // Return a cell with less food distance, undefined if none
        const newPos = world.adjPos[this.position.x][this.position.y].reduce((foodPos, nextPos) => {
            // If nextPos doesn't have a valid value, skip
            if (world.grid[nextPos.x][nextPos.y].foodDistance == -1)
                return foodPos;
            // If current foodPos isn't set ( == -1) but next is set
            if (world.grid[foodPos.x][foodPos.y].foodDistance == -1)
                return nextPos;
            // If nextPos is a valid value, update to min
            if (world.grid[foodPos.x][foodPos.y].foodDistance != -1 &&
                world.grid[nextPos.x][nextPos.y].foodDistance <
                    world.grid[foodPos.x][foodPos.y].foodDistance)
                return nextPos;
            return foodPos;
        });
        // If no improvement, abort
        if (getCell(newPos).foodDistance >= initialDistance)
            return undefined;
        // Return newPos if it has a valid foodDistance value
        if (world.grid[newPos.x][newPos.y].foodDistance != -1)
            return newPos;
        return undefined;
    }
    getMinNestDistanceCell() {
        const nextPos = world.adjPos[this.position.x][this.position.y].reduce((minPos, nextPos) => {
            if (world.grid[nextPos.x][nextPos.y].nestDistance <
                world.grid[minPos.x][minPos.y].nestDistance)
                return nextPos;
            return minPos;
        });
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
        else
            getCell(this.position).setCellsNestDistance(this.stepsFromNest);
    }
    isDiagonal(newPos) {
        return !(this.position.x == newPos.x || this.position.y == newPos.y);
    }
    reachedFood() {
        this.stepsFromFood = 0;
        getFoodCell(this.position).eatFood();
        if (getFoodCell(this.position).foodLeft <= 0)
            this.startEraseFoodTrail();
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
        // if (this.state === SCAVENGER_MODE || this.state == RANDOM_WALK_MODE) {
        //   fill(100, 100, 70);
        // } else {
        fill(20, 80, 80);
        //  }
        square(this.position.x * this.size, this.position.y * this.size, this.size);
    }
}
Ant.maxFuel = Math.max(GRID_W, GRID_H) * 1.5;
class Cell extends Obstacle {
    constructor(x, y, steps = 0) {
        super(x, y);
        //this.position = createVector(x, y);
        // this.size = CELL_SIZE;
        this.type = "Cell";
        this.nestDistance = Number.MAX_SAFE_INTEGER;
        this.foodDistance = -1;
        this.fDuration = 0; // food distance duration
        this.steps = steps;
        this.stepDuration = Cell.stepDuration;
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
            else
                world.grid[position.x][position.y].setDistance(steps + 2, property);
        }, this);
    }
    setDistance(steps, property) {
        if (property == "nest") {
            if (this.nestDistance > steps)
                this.nestDistance = steps;
        }
        else {
            // property == "food"
            if (this.foodDistance == -1)
                this.foodDistance = steps;
            else if (this.foodDistance > steps)
                this.foodDistance = steps;
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
        // Decrease should stop at 0, but
        // performance is better when changed to that
        // this.steps = Math.max(--this.steps, 0);
    }
    update() {
        this.updateSteps();
        this.fDuration = Math.max(--this.fDuration, 0);
        // Reset when duration passes
        if (this.fDuration == 0)
            this.foodDistance = -1;
    }
    updateSteps() {
        this.stepDuration--;
        if (this.stepDuration < 0)
            this.decreaseSteps();
    }
    // For debugging purposes
    paintSpecial() {
        fill(0);
        square(this.position.x * this.size, this.position.y * this.size, this.size);
    }
    render() {
        if (this.fDuration == 0)
            fill(48, 2, Math.max(98 - this.steps * 2, 20));
        // Make darker with more steps
        else
            fill(50, 100, 100); // Show as pheromone (food trail)
        square(this.position.x * this.size, this.position.y * this.size, this.size);
    }
}
Cell.stepDuration = Math.max(GRID_W, GRID_H) * 10;
// Maximum food distance duration
Cell.foodMaxD = Math.max(GRID_W, GRID_H) * 1.5;
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
            world.grid[this.position.x][this.position.y] = new Cell(this.position.x, this.position.y);
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
    update() { }
    render() {
        fill(100, 100, 100);
        square(this.position.x * this.size, this.position.y * this.size, this.size);
    }
}
// Classes helper functions
const getCell = (position) => world.grid[position.x][position.y];
const getFoodCell = (position) => world.grid[position.x][position.y];
const getAdjCellPos = (position) => world.adjPos[position.x][position.y];
const isSamePosition = (pos1, pos2) => pos1.x == pos2.x && pos1.y == pos2.y;
