import express from 'express';
import cookieParser from 'cookie-parser';
import LogMiddleware from './middlewares/log.middlewares.js';
import ErrorHandlingMiddleware from './middlewares/error-handling.middlewares.js';
import UsersRouter from './routes/users.router.js';

import GachaRouter from "./routes/gacha.router.js"
import TeamRouter from './routes/team.router.js'
import matchRouter from "./routes/match.routes.js"
import cors from 'cors';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT;

console.log(process.env.PORT);

app.use(cors());
app.use(LogMiddleware);
app.use(express.json());
app.use(cookieParser());
app.use('/api', [UsersRouter,GachaRouter,TeamRouter,matchRouter]);
app.use(ErrorHandlingMiddleware);

app.listen(PORT, () => {
    console.log(PORT, '포트로 서버가 열렸어요!');
});
