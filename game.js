import {defs, tiny} from './examples/common.js';
import { Text_Line } from './examples/text-demo.js';
import {Shape_From_File} from './examples/obj-file-demo.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

class RedLane {
    constructor(game, i, start_z) {
        this.game = game;
        this.lane_width = 2;
        this.lane_length = 70;

        this.z = start_z - i*this.lane_width;
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));

        this.red_color = hex_color("#f31515");
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.lane_length, 0.01, this.lane_width));
    }

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
    }

    detect_collision_with_player() {
        let this_coord = this.model_transform.transposed()[3].slice(0, 3);
        let player_coord = this.game.player_coord.transposed()[3].slice(0, 3);

        let this_z = this_coord[2];
        let player_z = player_coord[2];

        if (this.game.overlap(this_z, this_z + 2, player_z + 2, player_z + 2) && !this.game.jumping) {
            this.collided = true;
        } else {
            this.collided = false;
        }
    }

    render(context, program_state, t) {
        this.scale();
        this.detect_collision_with_player();
        if (this.collided) this.game.player_dead = true;
        this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color:this.red_color}));
    }
}

class RedSection {
    constructor(game, num_lanes, start_z) {
        this.game = game;
        this.lanes = [];
        //this.tStart = -1;
        this.lane_width = 2;

        this.num_lanes = num_lanes;

        for (let i = 0; i < this.num_lanes; i++) {
            this.lanes.push(new RedLane(game, i, start_z));
        }
    }

    jump_forward(lane, t, tMax, dt) {
        let dz = this.game.jump_length*dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;
    }

    shift_forward_lanes() {
        for (let i = 0; i < this.lanes.length; i++) {
            let lane = this.lanes.at(i);
            lane.shift_forward(-2);
        }
    }

    render(context, program_state, t, dt) {
        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                this.jump_forward(lane, t - this.game.tStart, 1, dt);

            }
        }

        for (let i = 0; i < this.lanes.length; i++) {
            let lane = this.lanes.at(i);
            lane.render(context, program_state, t);
        }
    }
}

class GrassLane {
    constructor(game, i, start_z) {
        this.game = game;
        this.lane_width = 2;
        this.lane_length = 70;
        this.obstacles = [];
        this.z = start_z - i*this.lane_width;
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));
        this.addTrees();
        this.grass_color = hex_color("#5db025");
    }

    addTrees() {
        let num_trees = 1;
        let tree_z = this.z + ((this.lane_width - 1.5)/2);

        //Random chance to generate up to 10 trees
        for (let i = -40; i < 30; i += 4) {
            if ((i < 0 || i > 8) && Math.random() < 0.25 && num_trees < 5) {
                this.obstacles.push(new Tree(this.game, i, tree_z));
                num_trees++;
            }
        }
    }

    render_trees(context, program_state, t) {
        for (let i = 0; i < this.obstacles.length; i++) {
            let tree = this.obstacles.at(i);
            tree.render(context, program_state, t);
        }
    }


    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.lane_length, 0.01, this.lane_width));
    }

    render(context, program_state, t) {
        this.scale();
        this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.grass);
        this.render_trees(context, program_state, t);
    }
}

class Grass {
    constructor(game, num_lanes, start_z) {
        this.game = game;
        this.lanes = [];
        //this.tStart = -1;
        this.lane_width = 2;

        this.num_lanes = num_lanes;

        for (let i = 0; i < this.num_lanes; i++) {
            this.lanes.push(new GrassLane(game, i, start_z));
        }
    }

    jump_forward(lane, player_angle, t, tMax, dt) {
        //console.log("Player Angle: "+ player_angle.toString())
        //let dz = 0.05; // Try dz = dt;
        let dz = this.game.jump_length*dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second
        
        
        //if(lane.z > 0.95) lane.z > 1 ? dz = 0 : dz = 1-lane.z;
        //console.log(lane.model_transform);
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;

        for (let j = 0; j < lane.obstacles.length; j++) {
            let log = lane.obstacles.at(j);
            log.shift_forward(dz);
        }

        if (t >= tMax) {
            //this.tStart = -1;
            //this.game.jumping = false;
        }
    }

    render(context, program_state, t, dt) {
        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                /*if (this.tStart == -1) {
                    this.tStart = t;
                }*/
                this.jump_forward(lane, 0, t - this.game.tStart, 1, dt);

            }
        }

        for (let i = 0; i < this.lanes.length; i++) {
            let lane = this.lanes.at(i);
            //if (i == 0) console.log(lane.model_transform);
            lane.render(context, program_state, t);
        }
    }
}

class Water {
    constructor(game, num_lanes, start_z) {
        this.game = game;
        this.lanes = [];
        //this.tStart = -1;
        this.lane_width = 2.5;
        
        if (num_lanes == -1) {
            //Generate random number of lanes per water: min 1, max 8
            this.num_lanes = 1 + Math.floor(Math.random() * 7);
        } else {
            this.num_lanes = num_lanes;
        }
        let log_or_lilypad = 0;
        for (let i = 0; i < this.num_lanes; i++) {
            if (this.lanes.length > 0 && this.lanes.at(i-1).log_or_lilypad != 0) {
                log_or_lilypad = 0;
            } else {
                if (Math.random() < 0.1) log_or_lilypad = 1;
            }
            this.lanes.push(new WaterLane(game, this.lane_width, i, start_z, log_or_lilypad));
        }
    }

    jump_forward(lane, player_angle, t, tMax, dt) {
        //console.log("Player Angle: "+ player_angle.toString())
        //let dz = 0.05; // Try dz = dt;
        let dz = this.game.jump_length*dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second

        //if(lane.z > 0.95) lane.z > 1 ? dz = 0 : dz = 1-lane.z;
        //console.log(lane.model_transform);
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;

        for (let j = 0; j < lane.obstacles.length; j++) {
            let log = lane.obstacles.at(j);
            log.shift_forward(dz);
        }
        

        if (t >= tMax) {
            //this.tStart = -1;
            //this.game.jumping = false;
        }
    }

    render(context, program_state, t, dt) {

        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                /*if (this.tStart == -1) {
                    this.tStart = t;
                }*/
                this.jump_forward(lane, 0, t - this.game.tStart, 1, dt);
            //if (i == 0) console.log("Model transform after dz "+lane.model_transform.toString());

            }
        }

        for (let i = 0; i < this.lanes.length; i++) {
            let lane = this.lanes.at(i);
            //if (i == 0) console.log(lane.model_transform);
            lane.render(context, program_state, t);
        }
    }


}


class WaterLane {
    constructor(game, lane_width, i, start_z, log_or_lilypad) {
        this.game = game;
        this.lane_width = lane_width;
        this.road_length = 70;
        this.z = start_z - (i*this.lane_width);
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));
        this.obstacles = [];
        this.direction = Math.floor(Math.random() * 2); //0 - left, 1 - right
        this.log_or_lilypad = log_or_lilypad; //0 - log, 1 - lilypad
        if (this.log_or_lilypad > 0) this.addLilypads();
    }

    addLog() {
        if (Math.random() < 0.01) {
            //Add new log if there are no more than 3 cars on the road lane
            //and there is no log immediately in front of new log
            if (this.obstacles.length > 0) {
                if (this.obstacles.length < 4) {
                    let log_position = this.z + ((this.lane_width - 1)/2);
                    if ((this.direction == 1 && this.obstacles.at(this.obstacles.length-1).x > -20) ||
                        (this.direction == 0 && this.obstacles.at(this.obstacles.length-1).x < 20)) {
                        this.obstacles.push(new Log(this.game, log_position, this.direction));
                    }
                }
            } else {
                let log_position = this.z + ((this.lane_width - 1)/2);
                this.obstacles.push(new Log(this.game, log_position, this.direction));
            }
        }
    }

    addLilypads() {
        let num_lilypads = 1;
        let lilypad_x = 4 * Math.floor(Math.random() * 3);
        let lilypad_z = this.z + ((this.lane_width - 1.5)/2);

        //One guaranteed lilypad
        this.obstacles.push(new LilyPad(this.game, lilypad_x, lilypad_z));

        //Random chance to generate up to 5 lilypads
        for (let i = -40; i < 30; i += 4) {
            if ((i < 0 || i > 8) && Math.random() < 0.25 && num_lilypads < 5) {
                this.obstacles.push(new LilyPad(this.game, i, lilypad_z));
                num_lilypads++;
            }
        }
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.road_length, 1, this.lane_width))
            .times(Mat4.rotation(1.5, 1, 0, 0));
    }

    render_logs(context, program_state, t) {
        this.addLog();

        for (let i = 0; i < this.obstacles.length; i++) {
            let log = this.obstacles.at(i);
            log.render(context, program_state, t);
            if (log.x < -40 || log.x > 40) this.obstacles.splice(i, 1);
        }
    }

    render_lilypads(context, program_state, t) {
        for (let i = 0; i < this.obstacles.length; i++) {
            let lilypad = this.obstacles.at(i);
            lilypad.render(context, program_state, t);
        }
    }

    detect_collision_with_player() {
        let this_coord = this.model_transform.transposed()[3].slice(0, 3);
        let player_coord = this.game.player_coord.transposed()[3].slice(0, 3);

        let this_y = this_coord[1];
        let this_z = this_coord[2];
        let player_y = player_coord[1];
        let player_z = player_coord[2];

        if (this.game.overlap(this_z, this_z + 2, player_z + 1.5*Math.cos(this.game.dir), player_z + 1.5*Math.cos(this.game.dir)) &&
            this.game.overlap(this_z, this_z + 2, player_z, player_z) &&
            (this.game.overlap(this_y, this_y, player_y-1.5, player_y))) {
            /*let is_on_obstacle = false;
            for (let i = 0; i < this.obstacles.length; i++) {
                let obstacle = this.obstacles.at(i);
                if (obstacle.collided) is_on_obstacle = true;
            }*/
            if (!this.game.on_a_log && !this.game.on_a_lilypad) this.collided = true;
        } else {
            this.collided = false;
        }
    }

    render(context, program_state, t) {
        this.scale();
        
        const random = (x) => Math.sin(1000 * x + program_state.animation_time / 1000);
        this.game.shapes.sheet.arrays.position.forEach((p, i, a) =>
            a[i] = vec3(p[0], p[1], .15 * random(i / a.length)));
        this.game.shapes.sheet.flat_shade();

        this.detect_collision_with_player();
        if (this.collided) {
            this.game.sinking = true;
            this.game.shapes.sheet.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color:hex_color("#f31515")}));
        } else {
            this.game.shapes.sheet.draw(context, program_state, this.scaled_model_transform, this.game.materials.water);
        }

        this.game.shapes.sheet.copy_onto_graphics_card(context.context, ["position", "normal"], false);

        if (this.log_or_lilypad == 0) {
            this.render_logs(context, program_state, t);
        } else {
            this.render_lilypads(context, program_state, t);
        }
    }
}

class Tree {
    constructor(game, x, z) {
        this.tree_length = 1;
        this.tree_height = (Math.random() * 2) + 1;
        this.model_transform = Mat4.identity().times(Mat4.translation(x, 2, z));
        this.scale();
        this.game = game;
        this.rotation_y = Math.random() * Math.PI;
    }

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.rotation(Math.PI * 2, 1, 0, 0)).times(Mat4.rotation(this.rotation_y, 0, 1, 0))
            .times(Mat4.scale(this.tree_length, this.tree_height, 1));
        this.scaled_model_transform_w1 = this.model_transform.times(Mat4.translation(0, 1 + this.tree_height, 0)).times(Mat4.scale(this.tree_height, this.tree_height, this.tree_height)).times(Mat4.rotation(this.rotation_y, 0, 1, 0));
    }

    render(context, program_state, t) {
        this.scale();

        if (this.collided) {
            this.game.shapes.trunk.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: hex_color("#fa0909")}));
        } else {
            this.game.shapes.trunk.draw(context, program_state, this.scaled_model_transform, this.game.materials.wood);
            this.game.shapes.leaf.draw(context, program_state, this.scaled_model_transform_w1, this.game.materials.leaf);
        }
    }
}

class LilyPad {
    constructor(game, x, z) {
        this.lilypad_length = 1.25;
        this.model_transform = Mat4.identity().times(Mat4.translation(x, -1, z));
        this.scale();
        this.game = game;
    }

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.rotation(1.5, 1, 0, 0))
            .times(Mat4.scale(this.lilypad_length, this.lilypad_length, 0.2));
    }

    detect_collision_with_player() {
        let this_coord = this.model_transform.transposed()[3].slice(0, 3);
        let player_coord = this.game.player_coord.transposed()[3].slice(0, 3);

        let this_x = this_coord[0];
        let this_z = this_coord[2];

        let player_x = player_coord[0];
        let player_z = player_coord[2];

        if (this.game.overlap(this_x, this_x + 2, player_x, player_x + 2)
            && this.game.overlap(this_z, this_z + 2, player_z, player_z + 2)
            && !this.game.on_a_log) {
            this.collided = true;
            this.game.on_a_lilypad = true;
        } else {
            if (this.collided) this.game.on_a_lilypad = false;
            this.collided = false;
        }
    }


    render(context, program_state, t) {
        this.scale();

        this.detect_collision_with_player();

        if (this.collided) {
            this.game.shapes.capped.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: hex_color("#fa0909")}));
        } else {
            this.game.shapes.capped.draw(context, program_state, this.scaled_model_transform, this.game.materials.leaf);
        }
    }
}

class Log {
    constructor(game, z, direction) {
        this.log_length = 10;
        this.direction = direction;
        if (this.direction == 1) {
            this.model_transform = Mat4.identity().times(Mat4.translation(-40, -1, z));
            this.x = -40;
        } else {
            this.model_transform = Mat4.identity().times(Mat4.translation(40, -1, z));
            this.x = 40;
        }
        this.scale();
        this.dx = 0.04;
        this.game = game;
    }

    move(t) {
        if (this.direction == 1) {
            this.x += this.dx;
            this.model_transform = this.model_transform.times(Mat4.translation(this.dx, 0, 0));
        } else {
            this.x -= this.dx;
            this.model_transform = this.model_transform.times(Mat4.translation(-this.dx, 0, 0));
        }
    }

    shift_downward(y) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, y, 0));
    }

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.rotation(1.57, 0, 1, 0))
            .times(Mat4.scale(1, 1, this.log_length));
    }

    detect_collision_with_player() {
        let this_coord = this.model_transform.transposed()[3].slice(0, 3);
        let player_coord = this.game.player_coord.transposed()[3].slice(0, 3);

        let this_x = this_coord[0];
        let this_z = this_coord[2];

        let player_x = player_coord[0];
        let player_z = player_coord[2];

        if (this.game.overlap(this_x - 3, this_x + 6, player_x, player_x + 2)
            && this.game.overlap(this_z+0.5, this_z + 1.5, player_z, player_z + 2)
            && !this.game.sinking && !this.game.on_a_lilypad) {
            this.collided = true;
            this.game.on_a_log = true;
            //Move player with log
            if (this.direction == 0) {
                this.game.lateral_translation = this.game.lateral_translation.times(Mat4.translation(-this.dx, 0, 0));
            } else {
                this.game.lateral_translation = this.game.lateral_translation.times(Mat4.translation(this.dx, 0, 0));
            }
        } else {
            if (this.collided) {
                this.game.on_a_log = false;
            }
            this.collided = false;
        }
    }

    render(context, program_state, t) {
        this.move(t)
        this.scale();
        this.detect_collision_with_player();

        if (this.collided) {
            this.game.shapes.capped.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: hex_color("#fd2727")}));
        }
        else {
            this.game.shapes.capped.draw(context, program_state, this.scaled_model_transform, this.game.materials.wood);
        }

    }
}

class Car {
    constructor(game, z, direction) {
        this.direction = direction;
        if (this.direction == 1) {
            this.model_transform = Mat4.identity().times(Mat4.translation(-40, 0, z));
            this.x = -40;
        } else {
            this.model_transform = Mat4.identity().times(Mat4.translation(40, 0, z));
            this.x = 40;
        }
        this.model_transform_w1 = this.model_transform.times(Mat4.translation(-1.8, -0.75, 1));
        this.model_transform_w2 = this.model_transform_w1.times(Mat4.translation(4, 0, 0));
        this.model_transform_w3 = this.model_transform_w1.times(Mat4.translation(0, 0, -2));
        this.model_transform_w4 = this.model_transform_w2.times(Mat4.translation(0, 0, -2));
        this.scale();
        this.dx = 0.1;
        this.game = game;
        this.collided = false;
        this.isSedan = Math.floor(Math.random() * 2);
    }

    move(t) {
        if (this.direction == 1) {
            this.x += this.dx;
            this.model_transform = this.model_transform.times(Mat4.translation(this.dx, 0, 0));
            this.model_transform_w1 = this.model_transform_w1.times(Mat4.translation(this.dx, 0, 0));
            this.model_transform_w2 = this.model_transform_w2.times(Mat4.translation(this.dx, 0, 0));
            this.model_transform_w3 = this.model_transform_w3.times(Mat4.translation(this.dx, 0, 0));
            this.model_transform_w4 = this.model_transform_w4.times(Mat4.translation(this.dx, 0, 0));
        } else {
            this.x -= this.dx;
            this.model_transform = this.model_transform.times(Mat4.translation(-this.dx, 0, 0));
            this.model_transform_w1 = this.model_transform_w1.times(Mat4.translation(-this.dx, 0, 0));
            this.model_transform_w2 = this.model_transform_w2.times(Mat4.translation(-this.dx, 0, 0));
            this.model_transform_w3 = this.model_transform_w3.times(Mat4.translation(-this.dx, 0, 0));
            this.model_transform_w4 = this.model_transform_w4.times(Mat4.translation(-this.dx, 0, 0));
        }
    }

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
        this.model_transform_w1 = this.model_transform_w1.times(Mat4.translation(0, 0, z));
        this.model_transform_w2 = this.model_transform_w2.times(Mat4.translation(0, 0, z));
        this.model_transform_w3 = this.model_transform_w3.times(Mat4.translation(0, 0, z));
        this.model_transform_w4 = this.model_transform_w4.times(Mat4.translation(0, 0, z));
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.translation(0, -0.2, 0))
            .times(Mat4.scale(2, 2, 2));
        let size = 1/1.75;
        this.scaled_model_transform_w1 = this.model_transform_w1.times(Mat4.scale(size, size, 0.3));
        this.scaled_model_transform_w2 = this.model_transform_w2.times(Mat4.scale(size, size, 0.3));
        this.scaled_model_transform_w3 = this.model_transform_w3.times(Mat4.scale(size, size, 0.3));
        this.scaled_model_transform_w4 = this.model_transform_w4.times(Mat4.scale(size, size, 0.3));
    }

    detect_collision_with_player() {
        let this_coord = this.model_transform.transposed()[3].slice(0, 3);
        let player_coord = this.game.player_coord.transposed()[3].slice(0, 3);

        let car_x = this_coord[0];
        let car_z = this_coord[2];

        let player_x = player_coord[0];
        let player_z = player_coord[2];

        if (this.game.overlap(car_x, car_x + 3, player_x, player_x + 3)
            && this.game.overlap(car_z, car_z + 2, player_z, player_z + 2)) {
            this.collided = true;
            this.game.car_direction = this.direction;
        } else {
            this.collided = false;
        }
    }


    render(context, program_state, t) {
        const car_color = hex_color("#bd112b");
        const truck_color = hex_color("#abd7eb");
        const collide_car_color = hex_color("#FFA500");
        const wheel_color = hex_color("#000000");
        if (!this.game.hit_by_car) this.move(t);
        this.scale();
        this.detect_collision_with_player();
        let opposite_mt = this.scaled_model_transform.times(Mat4.translation(0.2, 0, 0))
            .times(Mat4.rotation(Math.PI, 0, 1, 0));
        if (this.collided) {
            this.game.hit_by_car = true;
            if (this.isSedan) {
                if (this.direction == 1) {
                    this.game.shapes.truck.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: collide_car_color}));
                }
                else {
                     this.game.shapes.truck.draw(context, program_state, opposite_mt, this.game.materials.plastic.override({color: collide_car_color}));
                }
            }
            else {
                if (this.direction == 1) {
                    this.game.shapes.truck.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: collide_car_color}));
                }
                else {
                     this.game.shapes.truck.draw(context, program_state, opposite_mt, this.game.materials.plastic.override({color: collide_car_color}));
                }
            }
        } else {
            if (this.isSedan) {
                if (this.direction == 1) {
                    this.game.shapes.truck.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: car_color}));
                }
                else {
                    this.game.shapes.truck.draw(context, program_state, opposite_mt, this.game.materials.plastic.override({color: car_color}));
                }
            }
            else {
                if (this.direction == 1) {
                    this.game.shapes.truck.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: truck_color}));
                }
                else {
                    this.game.shapes.truck.draw(context, program_state, opposite_mt, this.game.materials.plastic.override({color: truck_color}));
                }
            }
        }
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w1, this.game.materials.plastic.override({color: wheel_color}));
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w2, this.game.materials.plastic.override({color: wheel_color}));
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w3, this.game.materials.plastic.override({color: wheel_color}));
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w4, this.game.materials.plastic.override({color: wheel_color}));
    }
}

class RoadLane {
    constructor(game, lane_width, i, start_z) {
        this.game = game;
        this.lane_width = lane_width;
        this.road_length = 70;
        this.z = start_z -(i*this.lane_width);
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));
        this.cars = [];
        this.direction = Math.floor(Math.random() * 2); //0 - left, 1 - right
    }

    addCar() {
        if (Math.random() < 0.002) {
            //Add new car if there are no more than 3 cars on the road lane
            //and there is no car immediately in front of new car
            if (this.cars.length > 0) {
                if (this.cars.length < 4) {
                    let car_position = this.z + ((this.lane_width - 1)/2);
                    if ((this.direction == 1 && this.cars.at(this.cars.length-1).x > -20) ||
                        (this.direction == 0 && this.cars.at(this.cars.length-1).x < 20)) {
                        this.cars.push(new Car(this.game, car_position, this.direction));
                    }
                }
            } else {
                let car_position = this.z + ((this.lane_width - 1)/2);
                this.cars.push(new Car(this.game, car_position, this.direction));
            }
        }
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.road_length, 0.01, this.lane_width));
    }

    render_cars(context, program_state, t) {
        this.addCar();

        //Render cars
        for (let i = 0; i < this.cars.length; i++) {
            let car = this.cars.at(i);
            car.render(context, program_state, t);
            if (car.x < -40 || car.x > 40) this.cars.splice(i, 1);
        }
    }

    render(context, program_state, t) {
        const road_color = hex_color("#4d4d4d");

        //Draw road lane
        this.scale();
        this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.road);

        //Draw cars
        this.render_cars(context, program_state, t);
    }
}

class Road {
    constructor(game, num_lanes, start_z) {
        this.game = game;
        this.lanes = [];
        //this.tStart = -1;
        this.lane_width = 2;

        if (num_lanes == -1) {
            //Generate random number of lanes per road: min 1, max 8
            this.num_lanes = 1 + Math.floor(Math.random() * 7);
        } else {
            this.num_lanes = num_lanes;
        }

        for (let i = 0; i < this.num_lanes; i++) {
            this.lanes.push(new RoadLane(game, this.lane_width, i, start_z));
        }
    }

    jump_forward(lane, player_angle, t, tMax, dt) {
        //console.log("Player Angle: "+ player_angle.toString())
        //let dz = 0.05; // Try dz = dt;
        let dz = this.game.jump_length*dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second
        
        
        //if(lane.z > 0.95) lane.z > 1 ? dz = 0 : dz = 1-lane.z;
        //console.log(lane.model_transform);
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;

        for (let j = 0; j < lane.cars.length; j++) {
            let car = lane.cars.at(j);
            car.shift_forward(dz);
        }
    }

    render(context, program_state, t, dt) {

        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                this.jump_forward(lane, this.game.dir, t - this.game.tStart, 1, dt);

            }
        }

        for (let i = 0; i < this.lanes.length; i++) {
            let lane = this.lanes.at(i);
            //if (i == 0) console.log(lane.model_transform);
            lane.render(context, program_state, t);
        }
    }


}


class Water_Shader extends defs.Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = texture2D( texture, f_tex_coord );
                if( tex_color.w < .01 ) discard;

                // Slightly disturb normals based on sampling the same image that was used for texturing:
                vec3 bumped_N  = N + tex_color.rgb - .5*vec3(1,1,1);
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w );

                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( bumped_N ), vertex_worldspace );
                gl_FragColor.a = 0.5;
              } `;

    }
}

class Base_Scene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.hover = this.swarm = false;

        // Water grid patch row and column operations
        const initial_corner_point = vec3(-1, -1, 0);
        const row_operation = (s, p) => p ? Mat4.translation(0, .2, 0).times(p.to4(1)).to3()
            : initial_corner_point;
        const column_operation = (t, p) => Mat4.translation(.2, 0, 0).times(p.to4(1)).to3();
        
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'player': new Shape_From_File("assets/bear.obj"),//new Player(),
            sedan: new Shape_From_File("assets/sedan_v7.obj"),
            truck: new Shape_From_File("assets/truck_v.obj"),
            wheel: new Shape_From_File("assets/wheel_v3.obj"),
            trunk: new Shape_From_File("assets/trunk.obj"),
            leaf: new Shape_From_File("assets/leaf.obj"),
            cube: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            sheet: new defs.Grid_Patch(10, 10, row_operation, column_operation),
            capped: new defs.Capped_Cylinder(1, 10, [[0, 2], [0, 1]]),
            text: new Text_Line(20)
        };

        //Texture coordinates
        this.shapes.cube.arrays.texture_coord.forEach(
            (v, i, l) => {
                v[0] = v[0] * 25;
            }
        )
        this.shapes.sheet.arrays.texture_coord.forEach(
            (v, i, l) => {
                v[0] = v[0] * 10;
            }
        )

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            water: new Material(new Water_Shader(), {ambient: 1, diffusivity: 1, specularity: 1, texture: new Texture("assets/clear_water.jpg")}),
            wood: new Material(new defs.Textured_Phong(1), {ambient: .5, texture: new Texture("assets/wood.jpg")}),
            leaf: new Material(new defs.Textured_Phong(1), {ambient: .5, texture: new Texture("assets/leaf.jpg")}),
            grass: new Material(new defs.Textured_Phong(1), {ambient: 1, texture: new Texture("assets/grass.jpeg"), color: hex_color("#000000")}),
            road: new Material(new defs.Textured_Phong(1), {ambient: 1, texture: new Texture("assets/road.jpeg"), color: hex_color("#000000")}),
            text_image: new Material(new defs.Textured_Phong(1), {
                ambient: 1, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/text.png")
            })
        };
        // The white material and basic shader are used for drawing the outline.
        this.white = new Material(new defs.Basic_Shader());
    }

    display(context, program_state) {
        // display():  Called once per frame of animation. Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(Mat4.translation(0, -5, -30).times(Mat4.rotation(Math.PI/4,1,0,0)));
        }
        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, 1, 100);

        // *** Lights: *** Values of vector or point lights.
        const light_position = vec4(0, 50, -35, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 2500)];
    }
}

export class Game extends Base_Scene {
    /**
     * This Scene object can be added to any display canvas.
     * We isolate that code so it can be experimented with on its own.
     * This gives you a very small code sandbox for editing a simple scene, and for
     * experimenting with matrix transformations.
     */
    constructor() {
        super();
        this.reset();
    }

    reset() {
        this.queuedMoves = 0;
        this.dir = 0;
        this.tStart = -1;

        this.score = 0;
        this.jump_length = 2;

        this.jumping = false;
        this.lateral_translation = Mat4.identity();
        this.fp = false;
        this.player_pos = Mat4.identity();
        this.player_coord = Mat4.identity();
        this.sections  = [];
        this.sections.push(new Grass(this, 5, 6));
        this.num_lanes = 10;
        this.last_lane_type = 0; // 0 - Grass, 1 - Road, 2 - Water
        this.draw_count = 30;
        this.red_section = new RedSection(this, 5, 18);
        this.hit_by_car = false;
        this.car_direction = 0; //0 - car going left, 1 - right
        this.sinking = false;
        this.on_a_log = false;
        this.on_a_lilypad = false;
        this.player_dead = false;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Toggle Camera View", ["c"], () => {
            this.fp = !this.fp;
        });

        this.key_triggered_button("Jump forward", ["i"], () => {
            this.queuedMoves++;

        });
        this.key_triggered_button("Jump backwards", ["k"], () => {
            this.dir = (this.dir+Math.PI)%(2*Math.PI);
            this.queuedMoves++;

        });
        this.key_triggered_button("Turn left", ["j"], () => {
            this.dir = (this.dir+(Math.PI/4)%(2*Math.PI));
        });
        this.key_triggered_button("Turn right", ["l"], () => {
            this.dir = (this.dir-(Math.PI/4)%(2*Math.PI));
        });
        
    }

    generate_lanes() {
        let next_lane_type = 0;

        //Check if there are enough lanes to fill the screen
        if (this.num_lanes < this.draw_count) {

            //Get next lane type and make sure it's not the same as previous
            next_lane_type = 1 + Math.floor(Math.random() * 2); //1 or 2
            if ((this.last_lane_type == 1 && next_lane_type == 1) ||
                (this.last_lane_type == 2 && next_lane_type == 2)) {
                next_lane_type = 0;
            }

            let last_section = this.sections.at(this.sections.length - 1);
            let next_z = last_section.lanes.at(last_section.lanes.length-1).z - 4;
            let next_num_lanes = 1 + Math.floor(Math.random() * 7);

            //Push next section
            if (next_lane_type == 0) {
                this.sections.push(new Grass(this, next_num_lanes, next_z));
            } else if (next_lane_type == 1) {
                this.sections.push(new Road(this, next_num_lanes, next_z));
            } else {
                this.sections.push(new Water(this, next_num_lanes, next_z));
            }

            this.last_lane_type = next_lane_type;
            this.num_lanes += next_num_lanes;
        }

        let first_section = this.sections.at(0);

        //Delete lane if it is out of bounds
        if (first_section.lanes.length > 0 && first_section.lanes.at(0).z > 16) {
            this.red_section.shift_forward_lanes();
            first_section.lanes.splice(0, 1);
            this.num_lanes--;
        }

        //Delete section if it has no lanes left
        if (first_section.lanes.length <= 0) {
            this.sections.splice(0, 1);
        }
    }

    overlap(x, xd, xp, xpd) {
        if (x <= xp) return (xp <= xd);
        return (x <= xpd);
    }

    player_out_of_bounds() {
        let player_coord = this.player_coord.transposed()[3].slice(0, 3);
        let player_x = player_coord[0];

        if (player_x > 30 || player_x < -30) return true;
        else return false;
    }

    sink_in_water(model_transform, t,tMax) {
        let y = (-t/tMax)*4;

        if (t >= tMax) {
            this.player_dead = true;
            this.sinking = false;
            this.tStart = -1;
        }

        return model_transform.times(Mat4.translation(0,y,0));
    }

    fall_over(model_transform, t,tMax, direction) {

        let theta = (t/tMax)*(Math.PI/2);
        if (direction == 1) theta = -1 * theta;

        if (t >= tMax) {
            this.player_dead = true;
            this.hit_by_car = false;
            this.tStart = -1;
        }

        return model_transform.times(Mat4.rotation(theta, 0,0,1));
    }

    // Returns model_tranform matrix accounting for jumping motion
    // Handles decreasing this.queuedMoves
    get_jump_traj(model_transform,t,yMax,tMax){
        let t_x = this.jump_length*Math.sin(this.dir);
        let z = (-t/tMax)*this.jump_length;
        //let y = -4*yMax*z*(z+1);
        let y = -4*yMax*z*(z+this.jump_length)/(this.jump_length**2);
        this.jumping = true;
        if(t>=tMax){
            y = 0; this.tStart = -1; this.queuedMoves--;
            // Shift camera view one unit forward
            this.jumping = false;
            this.lateral_translation = this.lateral_translation.times(Mat4.translation(-t_x,0,0));

            //Score can only increase
            let dScore = Math.round(this.jump_length*Math.cos(this.dir));
            if (dScore > 0) this.score += dScore;

        }

        //return model_transform.times(Mat4.translation(t_x*Math.cos(this.dir)*z,y,t_x*Math.sin(this.dir)*z));
        return model_transform.times(Mat4.translation(z*t_x/this.jump_length,y,0));
    }

    render_player(context, program_state, model_transform, t){
        const brown = hex_color("#964B00");

        if(this.sinking) {
            if(this.tStart==-1) this.tStart = t;
            model_transform = this.sink_in_water(model_transform, program_state.animation_time/1000-this.tStart, 1);
        }

        if(this.hit_by_car) {
            if(this.tStart==-1) this.tStart = t;
            model_transform = this.fall_over(model_transform, program_state.animation_time/1000-this.tStart, 1, this.car_direction);
        }

        if(this.on_a_log) {
            model_transform = model_transform.times(Mat4.translation(0, 1,0));
        }

        if(this.on_a_lilypad) {
            model_transform = model_transform.times(Mat4.translation(0, 0.25,0));
        }

            //model_transform = model_transform.times(Mat4.translation(0, 0, -0.5));
        model_transform = model_transform.times(Mat4.scale( 1, 1.5, 1));

        model_transform = model_transform.times(this.lateral_translation)
        
        // Add transformations for jump movement
        if(this.queuedMoves>0 && !this.sinking && !this.hit_by_car){
            if(this.tStart==-1) this.tStart = t;
            if (this.queuedMoves==1) model_transform = this.get_jump_traj(model_transform,program_state.animation_time/1000-this.tStart,1,1);
            else model_transform = this.get_jump_traj(model_transform,1,1,1);
        }


        model_transform = model_transform.times(Mat4.rotation(this.dir,0, 1, 0))
        let player_transform = model_transform.times(Mat4.rotation(Math.PI/2,0, 1, 0))

        this.shapes.player.draw(context, program_state, player_transform, this.materials.plastic.override({color:brown}));
        this.player_coord = model_transform;
        model_transform = model_transform.times(Mat4.scale( 1, 2/3, 1));
        model_transform = model_transform.times(Mat4.translation( 0, 0.75, -1.5));
        model_transform = model_transform.times(Mat4.scale( 1/2, 1/2, 1/2));
        // this.shapes.player.draw(context, program_state, model_transform, this.materials.plastic.override({color:blue}));
        this.player_pos = model_transform.times(Mat4.translation(0,3,5)); //Want fp camera view to be just in front of player
    }

    set_score(context, program_state, model_transform){
        this.shapes.text.set_string("Current Score: "+this.score.toString(), context.context);
        this.shapes.text.draw(context, program_state, model_transform.times(Mat4.translation(-10,0,6)), this.materials.text_image);
    }

    display(context, program_state) {
        super.display(context, program_state);
        if(this.fp) program_state.set_camera(Mat4.inverse(this.player_pos));
        else program_state.set_camera(Mat4.translation(0, -5, -30).times(Mat4.rotation(Math.PI/4,1,0,0)));
        
        const t = program_state.animation_time/1000, dt = program_state.animation_delta_time / 1000; // t is in seconds
        let model_transform = Mat4.identity();
        this.set_score(context, program_state, model_transform);
        

        this.generate_lanes();
        for (let i = 0; i < this.sections.length; i++) {
            let this_section = this.sections.at(i);
            let time = t; let d_time = dt;
            if(this.queuedMoves>1){
                time = this.tStart+1;
                d_time = time-t;
            }
            this_section.render(context, program_state, time, d_time);
        }

        let time = t; let d_time = dt;
        if(this.queuedMoves>1){
            time = this.tStart+1;
            d_time = time-t;
        }
        this.red_section.render(context, program_state, time, d_time);
        this.render_player(context, program_state, model_transform, t);
        if(this.player_out_of_bounds()) this.player_dead = true;

        if (this.player_dead) this.reset();
    }
}