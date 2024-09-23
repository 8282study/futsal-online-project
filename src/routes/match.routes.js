// import express from 'express';
// import { prisma } from '../utils/prisma/index.js';
// import authMiddleware from '../middlewares/auth.middleware.js';
// import gamelogic from '../gamelogic.js'; // 게임 로직 import
// import 'dotenv/config';

// const router = express.Router();

// router.post('/games/randomplay', authMiddleware, async (req, res, next) => {
//     try {
//         const { userID } = req.user;

//         // 현재 사용자의 정보 및 점수 가져오기
//         const currentUser = await prisma.users.findUnique({
//             where: { userID: +userID },
//             select: { score: true, stats: true, win: true, draw: true, loss: true }
//         });

//         if (!currentUser) {
//             return res.status(404).json({ error: '유저 정보가 없습니다' });
//         }

//         const userScore = currentUser.score;

//         // ±10점 범위의 상대방 찾기 (랜덤으로 한 명)
//         const opponent = await prisma.users.findFirst({
//             where: {
//                 score: {
//                     gte: userScore - 10,
//                     lte: userScore + 10,
//                 },
//                 userID: {
//                     not: +userID, // 자신 제외
//                 }
//             },
//             select: { userID: true, score: true, stats: true, win: true, draw: true, loss: true }
//         });

//         if (!opponent) {
//             return res.status(404).json({ message: '시합을 찾을 수 없습니다.' });
//         }

//         // 현재 사용자와 상대방의 팀 정보 가져오기 (EquippedPlayers 테이블 사용)
//         const userTeam = await prisma.equippedPlayers.findMany({
//             where: { userID: +userID },
//             select: { playerID: true, powerLevel: true }
//         });

//         const opponentTeam = await prisma.equippedPlayers.findMany({
//             where: { userID: opponent.userID },
//             select: { playerID: true, powerLevel: true }
//         });

//         // 게임 가능 여부 확인 (양 팀 모두 3명의 플레이어가 있는지 확인)
//         if (userTeam.length !== 3 || opponentTeam.length !== 3) {
//             return res.status(400).json({ message: '3명의 선수를 가지고 있지 않습니다.' });
//         }

//         // 각각의 가중치 설정 (51 ~ 130 범위)
//         const userCondition = Math.floor(Math.random() * 80) + 51;
//         const opponentCondition = Math.floor(Math.random() * 80) + 51;

//         // 각 유저의 점수와 가중치 반영
//         const scoreA = currentUser.stats * userCondition;
//         const scoreB = opponent.stats * opponentCondition;

//         // 경기 진행 로직
//         const result = gamelogic.startgame(scoreA, scoreB);
//         console.log(result);

//         if (result[0] === 'A') {
//             // 유저가 승리한 경우
//             await prisma.users.update({
//                 where: { userID: +userID },
//                 data: { 
//                     score: currentUser.score + 10,
//                     win: currentUser.win + 1
//                 }
//             });

//             // 상대방이 패배한 경우
//             await prisma.users.update({
//                 where: { userID: +opponent.userID },
//                 data: { 
//                     score: opponent.score - 10,
//                     loss: opponent.loss + 1
//                 }
//             });
//         } else if (result[0] === 'B') {
//             // 유저가 패배한 경우
//             await prisma.users.update({
//                 where: { userID: +userID },
//                 data: { 
//                     score: currentUser.score - 10,
//                     loss: currentUser.loss + 1
//                 }
//             });

//             // 상대방이 승리한 경우
//             await prisma.users.update({
//                 where: { userID: +opponent.userID },
//                 data: { 
//                     score: opponent.score + 10,
//                     win: opponent.win + 1
//                 }
//             });
//         }

//         return res.status(200).json({ data: result });

//     } catch (error) {
//         next(error);
//     }
// });

// export default router;
