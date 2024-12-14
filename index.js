const jsonServer = require('json-server');

const db = {
  garage: [
    { "name": "Tesla", "color": "#e6e6fa", "id": 1 },
    { "name": "BMW", "color": "#fede00", "id": 2 },
    { "name": "Mersedes", "color": "#6c779f", "id": 3 },
    { "name": "Ford", "color": "#ef3c40", "id": 4 },
  ],
  winners: [
    { id: 1, wins: 1, time: 10 },
  ],
};

const server = jsonServer.create();
const router = jsonServer.router(db);
const middlewares = jsonServer.defaults();

const PORT = process.env.PORT || 3000; 

const state = { velocity: {}, blocked: {} };

server.use(middlewares);

const STATUS = {
  STARTED: 'started',
  STOPPED: 'stopped',
  DRIVE: 'drive',
};

server.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

server.patch('/engine', (req, res) => {
  const { id, status } = req.query;

  if (!id || isNaN(+id) || +id <= 0) {
    return res.status(400).send('Required parameter "id" is missing or invalid. Should be a positive number');
  }

  if (!status || !/^(started|stopped|drive)$/.test(status)) {
    return res.status(400).send(`Wrong parameter "status". Expected: "started", "stopped", or "drive". Received: "${status}"`);
  }

  const car = db.garage.find(car => car.id === +id);
  if (!car) {
    return res.status(404).send('Car with such id was not found in the garage.');
  }

  const distance = 500000;

  if (status === STATUS.DRIVE) {
    if (state.blocked[id]) {
      return res.status(429).send('Drive already in progress. You can\'t run drive for the same car twice while it\'s not stopped.');
    }

    const velocity = state.velocity[id];
    if (!velocity) {
      return res.status(404).send('Engine parameters for car with such id were not found. Did you set the engine status to "started"?');
    }

    state.blocked[id] = true;

    const timeToComplete = Math.round(distance / velocity);

    delete state.velocity[id];

    const randomFailureChance = new Date().getMilliseconds() % 3 === 0;

    const timeout = Math.random() * timeToComplete ^ 0; 

    if (randomFailureChance) {
      setTimeout(() => {
        delete state.blocked[id];
        res.status(500).json({ success: false, message: 'Car has been stopped suddenly. Its engine was broken down.' });
      }, timeout);
    } else {
      setTimeout(() => {
        delete state.blocked[id];
        res.status(200).json({ success: true });
      }, timeToComplete);
    }

  } else {
    const speed = req.query.speed ? +req.query.speed : Math.random() * 2000 ^ 0;
    const velocity = status === STATUS.STARTED ? Math.max(50, Math.random() * 200 ^ 0) : 0;

    if (velocity) {
      state.velocity[id] = velocity;
    } else {
      delete state.velocity[id];
      delete state.blocked[id];
    }

    setTimeout(() => {
      res.status(200).json({ velocity, distance });
    }, speed);
  }
});

server.use(router);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
