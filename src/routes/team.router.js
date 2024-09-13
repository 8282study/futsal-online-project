// /**담당자: 김성록 */
// import express from 'express';
// import { prisma } from '../utils/prisma/index.js';
// import authMiddleware from '../middlewares/auth.middleware.js';

// //팀인원은 3명까지만

// const router = express.Router();

// router.post('/auth/createTeam', async (req, res, next)=>{
//     const { userID, playerID } = req.body;

//     //로그인한사람인지 확인

//     //보유선수 리스트에 추가할 플레이어 있는지 확인
//     // OwnedPlayers에 userID && playerID 있는지 검사
//     const checkID = await prisma.OwnedPlayers
//     if( )



//     // const mexTeam = await prisma.equippedPlayers.count({
//     //     while: { userID },
//     // })

//     // if( mexTeam > 3 ) 
//     return res.status(201).json({ userID })


//     //출전선수 테이블에 userID, playerID 추가
//     //출전선수 테이블에 동일한 userID 3개 있으면 에러반환
// });

// export default router;
