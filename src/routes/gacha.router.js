import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import 'dotenv/config';

const router = express.Router();


router.post('/gacha', authMiddleware, async (req, res, next) => {
    try {
        const { userID } = req.user; // 로그인한 사용자 정보에서 userID 추출
        
        // 유저 정보를 먼저 가져와 소지금 확인
        const user = await prisma.Users.findUnique({
            where: { userID: userID },
        });

        if (!user) {
            return res.status(404).json({ error: "유저 정보가 없습니다" });
        }

        // 소지금이 100원 미만일 경우 에러 반환
        if (user.cash < 100) {
            return res.status(400).json({ error: "캐쉬가 충분하지 않습니다" });
        }

        // PlayerList에서 랜덤으로 하나의 캐릭터를 선택
        const post1 = await prisma.PlayersList.findFirst({
            orderBy: {
                // 랜덤으로 정렬
                playerID: 'asc'
            },
            skip: Math.floor(Math.random() * await prisma.PlayersList.count()) // 랜덤한 characterId 추출
        });

        // 만약 찾은 캐릭터가 없을 경우
        if (!post1) {
            return res.status(404).json({ error: "캐릭터가 없습니다." });
        }
        const power = parseInt(post1.defense+post1.finishing+post1.shootPower+post1.speed+post1.stamina)
        
        // ownedPlayers에 데이터를 추가
        const post = await prisma.ownedPlayers.create({
            data: {
                userID: userID,
                playerID: post1.playerID, // 선택한 캐릭터의 playerID
                playerName: post1.playerName, // 선택한 캐릭터의 playerName
                powerLevel:power,
            }
        });

        // 소지금을 100원 감소시킴
        const updatedUser = await prisma.Users.update({
            where: { userID: userID },
            data: {
                cash: {
                    decrement: 100 // 소지금 100원 감소
                }
            }
        });


        return res.status(201).json({ data: post, updatedCash: updatedUser.cash }); // 성공적으로 추가된 데이터와 업데이트된 소지금 반환

        
    } catch (error) {
        next(error); // 에러 발생 시 다음 미들웨어로 에러 전달
    }
});

router.get('/gacha/:userID', authMiddleware, async (req, res, next) => {
    try {
        const { userID } = req.params;

        // 로그인한 사용자의 ID
        const loggedInUserID = req.user.userID;

        // // 요청한 userID와 로그인한 userID가 다를 경우 접근 금지
        // if (+userID !== loggedInUserID) {
        //     return res.status(403).json({ error: "조회할 수 없는 계정입니다." });
        // }

        const post = await prisma.ownedPlayers.findMany({
            where: {
                userID: +userID
            },
            select: {
                opID: true,
                playerID: true,
                playerName: true,
                powerLevel: true,
            }
        });
        // //보유 캐릭터 조회
        // if (!post || post.length === 0) {
        //     return res.status(404).json({ error: "보유하고 있는 캐릭터가 없습니다." });
        // }

        return res.status(200).json({ data: post });
    } catch (error) {
        next(error);
    }
});

// /** 선수 판매 API **/
// router.delete('/gacha/shell:playerID', authMiddleware, async (req, res, next) => {
//     try {

//         const { playerID } = req.params;
//         const { userID } = req.user; // 로그인한 사용자 정보에서 userID 추출
//         const user = await prisma.Users.findUnique({
//             where: { userID: userID },
//         })
//         const shell = await prisma.ownedPlayers.findFirst({
//             where: { playerID: +playerID }
//         });

//         if (!shell)
//             return res
//                 .status(404)
//                 .json({ message: '보유한 선수 리스트에 해당 선수가 존재하지 않습니다.' });
//         await prisma.ownedPlayers.delete({ where: { playerID: +playerID } });

//         // 소지금을 100원 증가시킴
//         const updatedUser = await prisma.Users.update({
//             where: { userID:+ userID },
//             data: {
//                 cash: {
//                     increment: 100 // 소지금 100원 증가
//                 }
//             }
//         });

//         return res.status(200).json({ data: '해당 선수를 팔았습니다.',updatedCash: updatedUser.cash });



//     } catch (error) {
//         next(error);
//     }
// });

export default router;
