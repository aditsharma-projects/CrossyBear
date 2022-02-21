import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Matrix, Mat4, Light, Shape, Material, Scene,
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


class Base_Scene extends Scene {
    /**
     *  **Base_scene** is a Scene that can be added to any display canvas.
     *  Setup the shapes, materials, camera, and lighting here.
     */
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            'player': new Player()
        };

        // *** Materials
        this.materials = {
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
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
            program_state.set_camera(Mat4.translation(5, -10, -30));
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
    }
    set_view() {
        
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Toggle Camera View", ["c"], this.set_view);

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

    draw_box(context, program_state, model_transform, index) {
        const col = this.colors[index];
        //const blue = hex_color("#1a9ffa");
        //let theta = 0.05*Math.PI;
        let t = program_state.animation_time/1000; // t is in seconds
        let a = 0.05*Math.PI/2;
        let b = a;
        let w = 2*Math.PI/3
        let theta = this.moving ? a+b*Math.sin(w*t) : 2*a;

        // TODO:  Helper function for requirement 3 (see hint).
        //        This should make changes to the model_transform matrix, draw the next box, and return the newest model_transform.
        // Hint:  You can add more parameters for this function, like the desired color, index of the box, etc.
        model_transform = model_transform.times(Mat4.translation(0,2,0));    
        model_transform = model_transform.times(Mat4.rotation(theta, 0, 0, 1));
        //model_transform = model_transform.times(Mat4.translation(-1+Math.cos(theta)-Math.sin(theta),-1+Math.sin(theta)+Math.cos(theta),0)); OLD (INCORRECT) CORRECTION
        model_transform = model_transform.times(Mat4.translation(1-Math.cos(theta)-Math.sin(theta),1+Math.sin(theta)-Math.cos(theta),0));
        if(this.outline) this.shapes.outline.draw(context, program_state, model_transform, this.white,"LINES")
        else{
            index%2==0 ? this.shapes.strip.draw(context, program_state, model_transform, this.materials.plastic.override({color:col}),"TRIANGLE_STRIP")
            : this.shapes.cube.draw(context, program_state, model_transform, this.materials.plastic.override({color:col}));
        }
        return model_transform;
    }

    // Returns model_tranform matrix accounting for jumping motion
    // Handles decreasing this.queuedMoves
    get_jump_traj(model_transform,t,yMax,tMax){
        let z = -t/tMax;
        let y = -4*yMax*z*(z+1);
        if(t>=tMax){
            y = 0; this.tStart = -1; this.queuedMoves--;
            // Shift camera view one unit forward
        }
        return model_transform.times(Mat4.translation(0,y,z));
    }

    render_player(context, program_state, model_transform, t){
        const blue = hex_color("#1a9ffa");
        model_transform = model_transform.times(Mat4.scale( 1, 1.5, 1))
        // Example for drawing a cube, you can remove this line if needed
        model_transform = model_transform.times(Mat4.rotation(this.dir,0, 1, 0))
        // Add transformations for jump movement
        if(this.queuedMoves>0){
            if(this.tStart==-1) this.tStart = t;
            model_transform = this.get_jump_traj(model_transform,program_state.animation_time/1000-this.tStart,1,1);

        }
        this.shapes.player.draw(context, program_state, model_transform, this.materials.plastic.override({color:blue}));
        model_transform = model_transform.times(Mat4.scale( 1, 2/3, 1));
        model_transform = model_transform.times(Mat4.translation( 0, 0.75, -1.5));
        model_transform = model_transform.times(Mat4.scale( 1/2, 1/2, 1/2));
        this.shapes.player.draw(context, program_state, model_transform, this.materials.plastic.override({color:blue}));
    }

    display(context, program_state) {
        super.display(context, program_state);
        const t = program_state.animation_time/1000; // t is in seconds
        let model_transform = Mat4.identity();
        this.render_player(context, program_state, model_transform, t);
    }
}