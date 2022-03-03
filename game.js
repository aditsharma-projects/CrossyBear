import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

class Player extends Shape {
    constructor() {
        super("position", "normal",);
        // Loop 3 times (for each axis), and inside loop twice (for opposing cube sides):
        this.arrays.position = Vector3.cast(
            [-1, -1, -1], [1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, -1], [-1, 1, -1], [1, 1, 1], [-1, 1, 1],
            [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1], [1, -1, 1], [1, -1, -1], [1, 1, 1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1], [1, -1, -1], [-1, -1, -1], [1, 1, -1], [-1, 1, -1]);
        this.arrays.normal = Vector3.cast(
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1]);
        // Arrange the vertices into a square shape in texture space too:
        this.indices.push(0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6, 8, 9, 10, 9, 11, 10, 12, 13,
            14, 13, 15, 14, 16, 17, 18, 17, 19, 18, 20, 21, 22, 21, 23, 22);
    }
}


class GrassLane {
    constructor(game, i) {
        this.game = game;
        this.lane_width = 2;
        this.lane_length = 70;

        //To be changed after midway demo
        this.z = 4 + i*this.lane_width;
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));

        this.grass_color = hex_color("#5db025");
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.lane_length, 0.01, this.lane_width));
    }

    render(context, program_state, t) {
        this.scale();
        this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: this.grass_color}));
    }
}

class Grass {
    constructor(game) {
        this.game = game;
        this.lanes = [];
        this.tStart = -1;
        this.lane_width = 2;
        //Generate random number of lanes per grass: min 2, max 8
        //this.numLanes = 2 + Math.floor(Math.random() * 6);

        //For testing, fixed number of lanes
        this.numLanes = 5;

        for (let i = 0; i < this.numLanes; i++) {
            this.lanes.push(new GrassLane(game, i));
        }
    }

    jump_forward(lane, player_angle, t, tMax, dt) {
        //console.log("Player Angle: "+ player_angle.toString())
        //let dz = 0.05; // Try dz = dt;
        let dz = dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second
        
        
        //if(lane.z > 0.95) lane.z > 1 ? dz = 0 : dz = 1-lane.z;
        //console.log(lane.model_transform);
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;

        if (t >= tMax) {
            this.tStart = -1;
            this.game.jumping = false;
        }
    }

    render(context, program_state, t, dt) {
        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                if (this.tStart == -1) {
                    this.tStart = t;
                }
                this.jump_forward(lane, 0, t - this.tStart, 1, dt);

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
    constructor(game) {
        this.game = game;
        this.lanes = [];
        this.tStart = -1;
        this.lane_width = 1;
        //Generate random number of lanes per road: min 2, max 8
        //this.numLanes = 2 + Math.floor(Math.random() * 6);

        //For testing, fixed number of lanes
        this.numLanes = 5;

        for (let i = 0; i < this.numLanes; i++) {
            this.lanes.push(new WaterLane(game, this.lane_width, i));
        }
    }

    jump_forward(lane, player_angle, t, tMax, dt) {
        //console.log("Player Angle: "+ player_angle.toString())
        //let dz = 0.05; // Try dz = dt;
        let dz = dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second
        
        
        //if(lane.z > 0.95) lane.z > 1 ? dz = 0 : dz = 1-lane.z;
        //console.log(lane.model_transform);
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;

        for (let j = 0; j < lane.logs.length; j++) {
            let log = lane.logs.at(j);
            log.shift_forward(dz);
        }
        

        if (t >= tMax) {
            this.tStart = -1;
            this.game.jumping = false;
        }
    }

    render(context, program_state, t, dt) {

        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                if (this.tStart == -1) {
                    this.tStart = t;
                }
                this.jump_forward(lane, 0, t - this.tStart, 1, dt);
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
    constructor(game, lane_width, i) {
        this.game = game;
        this.lane_width = lane_width;
        this.road_length = 70;
        this.z = -(i*1.5) - 11;
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));
        this.logs = [];
        this.direction = Math.floor(Math.random() * 2); //0 - left, 1 - right
    }

    addLog() {
        if (Math.random() < 0.001) {
            //Add new car if there are no more than 3 cars on the road lane
            //and there is no car immediately in front of new car
            if (this.logs.length > 0) {
                if (this.logs.length < 4) {
                    let log_position = this.z - ((this.lane_width - 1)/2);
                    if ((this.direction == 1 && this.logs.at(this.logs.length-1).x > -20) ||
                        (this.direction == 0 && this.logs.at(this.logs.length-1).x < 20)) {
                        if (Math.random() < 0.5) {
                            this.logs.push(new Log(this.game, log_position, this.direction));
                        }
                        else {
                            this.logs.push(new LilyPad(this.game, log_position, this.direction));
                        }
                        
                    }
                }
            } else {
                let log_position = this.z - ((this.lane_width - 1)/2);
                if (Math.random() < 0.5) {
                    this.logs.push(new Log(this.game, log_position, this.direction));
                }
                else {
                    this.logs.push(new LilyPad(this.game, log_position, this.direction));
                }
            }
        }
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.road_length, 1, this.lane_width))
            .times(Mat4.rotation(1.5, 1, 0, 0));
    }

    render_logs(context, program_state, t) {
        this.addLog();

        //Render cars
        for (let i = 0; i < this.logs.length; i++) {
            let log = this.logs.at(i);
            log.render(context, program_state, t);
            if (log.x < -40 || log.x > 30) this.logs.splice(i, 1);
        }
    }

    render(context, program_state, t) {
        //Draw road lane
        this.scale();
        
        const random = (x) => Math.sin(1000 * x + program_state.animation_time / 1000);
        this.game.shapes.sheet.arrays.position.forEach((p, i, a) =>
            a[i] = vec3(p[0], p[1], .15 * random(i / a.length)));
        this.game.shapes.sheet.flat_shade();
        this.game.shapes.sheet.draw(context, program_state, this.scaled_model_transform, this.game.materials.water);
        this.game.shapes.sheet.copy_onto_graphics_card(context.context, ["position", "normal"], false);

        //Draw cars
        this.render_logs(context, program_state, t);
    }
}

class LilyPad {
    constructor(game, z, direction) {
        this.log_length = 1.5;
        this.direction = direction;
        if (this.direction == 1) {
            this.model_transform = Mat4.identity().times(Mat4.translation(-40, -1, z));
            this.x = -40;
        } else {
            this.model_transform = Mat4.identity().times(Mat4.translation(30, -1, z));
            this.x = 30;
        }
        this.scale();
        this.dx = 0.1;
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

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.rotation(1.5, 1, 0, 0))
            .times(Mat4.scale(this.log_length, this.log_length, 0.2));
    }


    render(context, program_state, t) {
        this.move(t)
        this.scale();
        this.game.shapes.capped.draw(context, program_state, this.scaled_model_transform, this.game.materials.leaf);
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
            this.model_transform = Mat4.identity().times(Mat4.translation(30, -1, z));
            this.x = 30;
        }
        this.scale();
        this.dx = 0.1;
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

    shift_forward(z) {
        this.model_transform = this.model_transform.times(Mat4.translation(0, 0, z));
    }

    scale() {
        this.scaled_model_transform = this.model_transform.times(Mat4.rotation(1.57, 0, 1, 0))
            .times(Mat4.scale(1, 1, this.log_length));
    }


    render(context, program_state, t) {
        this.move(t)
        this.scale();
        this.game.shapes.capped.draw(context, program_state, this.scaled_model_transform, this.game.materials.wood);
    }
}

class Car {
    constructor(game, z, direction) {
        this.car_length = 3;
        this.direction = direction;
        if (this.direction == 1) {
            this.model_transform = Mat4.identity().times(Mat4.translation(-40, 1, z));
            this.x = -40;
        } else {
            this.model_transform = Mat4.identity().times(Mat4.translation(30, 1, z));
            this.x = 30;
        }
        this.model_transform_w1 = this.model_transform.times(Mat4.translation(-1.5, -1.5, 1));
        this.model_transform_w2 = this.model_transform_w1.times(Mat4.translation(3, 0, 0));
        this.model_transform_w3 = this.model_transform_w1.times(Mat4.translation(0, 0, -2));
        this.model_transform_w4 = this.model_transform_w2.times(Mat4.translation(0, 0, -2));
        this.scale();
        this.dx = 0.1;
        this.game = game;
        this.collided = false;
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
        this.scaled_model_transform = this.model_transform.times(Mat4.scale(this.car_length, 1.5, 1));
        this.scaled_model_transform_w1 = this.model_transform_w1.times(Mat4.scale(1, 1, 0.5));
        this.scaled_model_transform_w2 = this.model_transform_w2.times(Mat4.scale(1, 1, 0.5));
        this.scaled_model_transform_w3 = this.model_transform_w3.times(Mat4.scale(1, 1, 0.5));
        this.scaled_model_transform_w4 = this.model_transform_w4.times(Mat4.scale(1, 1, 0.5));
    }


    render(context, program_state, t) {
        const car_color = hex_color("#bd112b");
        const collide_car_color = hex_color("#FFA500");
        const wheel_color = hex_color("#000000");
        // console.log(this.model_transform_w1.transposed()[3]);
        this.move(t);
        this.scale();
        if (this.collided) {
            this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: collide_car_color}));
        }
        else {
            this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: car_color}));
        }
        // console.log(this.collided);
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w1, this.game.materials.plastic.override({color: wheel_color}));
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w2, this.game.materials.plastic.override({color: wheel_color}));
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w3, this.game.materials.plastic.override({color: wheel_color}));
        this.game.shapes.sphere.draw(context, program_state, this.scaled_model_transform_w4, this.game.materials.plastic.override({color: wheel_color}));
    }
}

class RoadLane {
    constructor(game, lane_width, i) {
        this.game = game;
        this.lane_width = lane_width;
        this.road_length = 70;
        this.z = -(i*this.lane_width);
        this.model_transform = Mat4.identity().times(Mat4.translation(0, -1.5, this.z));
        this.cars = [];
        this.direction = Math.floor(Math.random() * 2); //0 - left, 1 - right
    }

    addCar() {
        if (Math.random() < 0.001) {
            //Add new car if there are no more than 3 cars on the road lane
            //and there is no car immediately in front of new car
            if (this.cars.length > 0) {
                if (this.cars.length < 4) {
                    let car_position = this.z - ((this.lane_width - 1)/2);
                    if ((this.direction == 1 && this.cars.at(this.cars.length-1).x > -20) ||
                        (this.direction == 0 && this.cars.at(this.cars.length-1).x < 20)) {
                        this.cars.push(new Car(this.game, car_position, this.direction));
                    }
                }
            } else {
                let car_position = this.z - ((this.lane_width - 1)/2);
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
            if (car.x < -40 || car.x > 30) this.cars.splice(i, 1);
        }
    }

    render(context, program_state, t) {
        const road_color = hex_color("#4d4d4d");

        //Draw road lane
        this.scale();
        this.game.shapes.cube.draw(context, program_state, this.scaled_model_transform, this.game.materials.plastic.override({color: road_color}));

        //Draw cars
        this.render_cars(context, program_state, t);
    }
}

class Road {
    constructor(game) {
        this.game = game;
        this.lanes = [];
        this.tStart = -1;
        this.lane_width = 2;
        //Generate random number of lanes per road: min 2, max 8
        //this.numLanes = 2 + Math.floor(Math.random() * 6);

        //For testing, fixed number of lanes
        this.numLanes = 5;

        for (let i = 0; i < this.numLanes; i++) {
            this.lanes.push(new RoadLane(game, this.lane_width, i));
        }
    }

    jump_forward(lane, player_angle, t, tMax, dt) {
        //console.log("Player Angle: "+ player_angle.toString())
        //let dz = 0.05; // Try dz = dt;
        let dz = dt*Math.cos(this.game.dir); if(t==0) dz = 0; // Small edge case, don't want to add dz at the 0th second
        
        
        //if(lane.z > 0.95) lane.z > 1 ? dz = 0 : dz = 1-lane.z;
        //console.log(lane.model_transform);
        lane.model_transform = lane.model_transform.times(Mat4.translation(0, 0, dz));
        lane.z += dz;

        for (let j = 0; j < lane.cars.length; j++) {
            let car = lane.cars.at(j);
            car.shift_forward(dz);
        }

        if (t >= tMax) {
            this.tStart = -1;
            this.game.jumping = false;
        }
    }

    render(context, program_state, t, dt) {

        if (this.game.jumping) {
            for (let i = 0; i < this.lanes.length; i++) {
                let lane = this.lanes.at(i);
                if (this.tStart == -1) {
                    this.tStart = t;
                }
                this.jump_forward(lane, this.game.dir, t - this.tStart, 1, dt);
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
            'player': new Player(),
            cube: new defs.Cube(),
            sphere: new defs.Subdivision_Sphere(4),
            sheet: new defs.Grid_Patch(10, 10, row_operation, column_operation),
            capped: new defs.Capped_Cylinder(1, 10, [[0, 2], [0, 1]]),
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            water: new Material(new Water_Shader(), {ambient: 1, diffusivity: 1, specularity: 1, texture: new Texture("assets/clear_water.jpg")}),
            wood: new Material(new defs.Textured_Phong(1), {ambient: .5, texture: new Texture("assets/wood.jpg")}),
            leaf: new Material(new defs.Textured_Phong(1), {ambient: .5, texture: new Texture("assets/leaf.jpg")}),
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
        const light_position = vec4(0, 5, 5, 1);
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];
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
        this.queuedMoves = 0;
        this.dir = 0;
        this.tStart = -1;
        this.road = new Road(this);
        this.grass = new Grass(this);
        this.water = new Water(this);

        this.jumping = false;
        this.lateral_translation = Mat4.identity();
        this.fp = false;
        this.player_pos = Mat4.identity();
        this.player_coord = Mat4.identity();
    }
    set_view() {
        
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Toggle Camera View", ["c"], () => {
            this.fp = !this.fp;
        });

        this.key_triggered_button("Jump forward", ["i"], () => {
            this.queuedMoves++;

        });
        this.key_triggered_button("Turn left", ["j"], () => {
            if(this.dir<=5*Math.PI/12) this.dir += Math.PI/12;
            else this.dir = Math.PI/2;
        });
        this.key_triggered_button("Turn right", ["l"], () => {
            if(this.dir>=-5*Math.PI/12) this.dir -= Math.PI/12;
            else this.dir = -Math.PI/2;
        });
        
    }

    overlap(x, xd, xp, xpd) {
        if (x <= xp) return (xp <= xd);
        return (x <= xpd);
    }

    // Simple collision detection
    detect_collision_with_player(obstacle) {
        let obstacle_coord = obstacle.model_transform.transposed()[3].slice(0, 3);
        let player_coord = this.player_coord.transposed()[3].slice(0, 3);

        let car_x = obstacle_coord[0];
        let car_y = obstacle_coord[1];
        let car_z = obstacle_coord[2];

        let player_x = player_coord[0];
        let player_y = player_coord[1];
        let player_z = player_coord[2];

        if (this.overlap(car_x, car_x+6, player_x, player_x+2) 
                && this.overlap(car_y, car_y+3, player_y, player_y+3) 
                && this.overlap(car_z, car_z+2, player_z, player_z+2)) {
                obstacle.collided = true;
            return;
        }
        else {
            obstacle.collided = false;
        }
    }

    // Returns model_tranform matrix accounting for jumping motion
    // Handles decreasing this.queuedMoves
    get_jump_traj(model_transform,t,yMax,tMax){
        let t_x = Math.sin(this.dir);
        let z = -t/tMax;
        let y = -4*yMax*z*(z+1);
        this.jumping = true;
        if(t>=tMax){
            y = 0; this.tStart = -1; this.queuedMoves--;
            // Shift camera view one unit forward
            this.jumping = false;
            this.lateral_translation = this.lateral_translation.times(Mat4.translation(-t_x,0,0))

        }
        //return model_transform.times(Mat4.translation(t_x*Math.cos(this.dir)*z,y,t_x*Math.sin(this.dir)*z));
        return model_transform.times(Mat4.translation(z*t_x,y,0));
    }

    render_player(context, program_state, model_transform, t){
        const blue = hex_color("#1a9ffa");
        model_transform = model_transform.times(Mat4.scale( 1, 1.5, 1))
        // Example for drawing a cube, you can remove this line if needed

        model_transform = model_transform.times(this.lateral_translation)
        
        // Add transformations for jump movement
        if(this.queuedMoves>0){
            if(this.tStart==-1) this.tStart = t;
            model_transform = this.get_jump_traj(model_transform,program_state.animation_time/1000-this.tStart,1,1);
        }
    

        model_transform = model_transform.times(Mat4.rotation(this.dir,0, 1, 0))

        this.shapes.player.draw(context, program_state, model_transform, this.materials.plastic.override({color:blue}));
        this.player_coord = model_transform;
        model_transform = model_transform.times(Mat4.scale( 1, 2/3, 1));
        model_transform = model_transform.times(Mat4.translation( 0, 0.75, -1.5));
        model_transform = model_transform.times(Mat4.scale( 1/2, 1/2, 1/2));
        this.shapes.player.draw(context, program_state, model_transform, this.materials.plastic.override({color:blue}));
        this.player_pos = model_transform.times(Mat4.translation(0,3,5)); //Want fp camera view to be just in front of player
    }

    display(context, program_state) {
        super.display(context, program_state);
        if(this.fp) program_state.set_camera(Mat4.inverse(this.player_pos));
        else program_state.set_camera(Mat4.translation(0, -5, -30).times(Mat4.rotation(Math.PI/4,1,0,0)));
        
        const t = program_state.animation_time/1000, dt = program_state.animation_delta_time / 1000; // t is in seconds
        let model_transform = Mat4.identity();

        for (let i = 0; i < this.road.lanes.length; i++) {
            for (let j = 0; j < this.road.lanes[i].cars.length; j++) {
                let car = this.road.lanes[i].cars[j];
                this.detect_collision_with_player(car);
            }
        }
        
        this.render_player(context, program_state, model_transform, t);
        this.road.render(context, program_state, t, dt);
        this.grass.render(context, program_state, t, dt);
        this.water.render(context, program_state, t, dt);
    }
}