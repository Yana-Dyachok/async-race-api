const jsonServer = require('json-server');

const db = {
    garage: [
        { "name": "Tesla", "color": "#e6e6fa", "id": 1 },
        { "name": "BMW", "color": "#fede00", "id": 2 },
        { "name": "Mersedes", "color": "#6c779f", "id": 3 },
        { "name": "Ford", "color": "#ef3c40", "id": 4 },
    ],
    winners: [{ id: 1, wins: 1, time: 10 }],
};

const server = jsonServer.create();
const router = jsonServer.router(db);
const middlewares = jsonServer.defaults();

const state = { velocity: {}, blocked: {} };

const STATUS = {
    STARTED: 'started',
    STOPPED: 'stopped',
    DRIVE: 'drive',
};

server.use(middlewares);


server.patch('/engine', (req, res) => {
    const { id, status } = req.query;

    if (!id || Number.isNaN(+id) || +id <= 0) {
        return res.status(400).send('Required parameter "id" is missing. Should be a positive number');
    }

    if (!status || !/^(started)|(stopped)|(drive)$/.test(status)) {
        return res.status(400).send(`Wrong parameter "status". Expected: "started", "stopped" or "drive". Received: "${status}"`);
    }

    if (!db.garage.find(car => car.id === +id)) {
        return res.status(404).send('Car with such id was not found in the garage.');
    }

    const distance = 500000;

    if (status === 'drive') {
        if (state.blocked[id]) {
            return res.status(429).send('Drive already in progress. You can\'t run drive for the same car twice while it\'s not stopped.');
        }

        const velocity = state.velocity[id];

        if (!velocity) {
            return res.status(404).send('Engine parameters for car with such id were not found. Have you tried to set engine status to "started" before?');
        }

        state.blocked[id] = true;

        const time = Math.round(distance / velocity);

        delete state.velocity[id];

        if (Math.random() < 0.33) { 
            setTimeout(() => {
                delete state.blocked[id];
                res.header('Content-Type', 'application/json')
                    .status(500)
                    .send('Car has been stopped suddenly. The engine broke down.');
            }, Math.random() * time ^ 0);
        } else {
            setTimeout(() => {
                delete state.blocked[id];
                res.header('Content-Type', 'application/json')
                    .status(200)
                    .send(JSON.stringify({ success: true }));
            }, time);
        }
    } else {
        const randomTime = req.query.speed ? +req.query.speed : Math.random() * 2000 ^ 0;

        const velocity = status === 'started' ? Math.max(50, Math.random() * 200 ^ 0) : 0;

        if (velocity) {
            state.velocity[id] = velocity;
        } else {
            delete state.velocity[id];
            delete state.blocked[id];
        }

        setTimeout(() => {
            res.header('Content-Type', 'application/json')
                .status(200)
                .send(JSON.stringify({ velocity, distance }));
        }, randomTime);
    }
});


exports.handler = async (event, context) => {
    const req = {
        url: event.path,
        method: event.httpMethod,
        headers: event.headers,
        body: event.body,
        query: event.queryStringParameters,
    };

    const res = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: null,
        send(body) {
            this.body = body;
            return this;
        },
        status(code) {
            this.statusCode = code;
            return this;
        },
        header(name, value) {
            this.headers[name] = value;
            return this;
        },
    };

    server.use(router);
    await server(req, res);
    return res;
};
