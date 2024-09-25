// /**담당자: 김성록 */
import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

// 새로운 팀원을 추가하는 엔드포인트
router.post('/auth/createTeam', authMiddleware, async (req, res, next) => {
    const { userID } = req.user; // 인증된 사용자 ID
    const { playerID, powerLevel } = req.body; // 요청 본문에서 playerID와 powerLevel을 추출

    // 사용자가 해당 playerID와 powerLevel을 소유하고 있는지 확인
    const checkID = await prisma.ownedPlayers.findFirst({
        where: {
            userID: userID,
            playerID: playerID,
            powerLevel: powerLevel,
        },
        select: { powerLevel: true },
    });

    // 사용자가 해당 playerID와 powerLevel을 소유하고 있다면
    if (checkID) {
        const { powerLevel } = checkID;

        try {
            // 사용자가 현재 팀에 배치한 선수 수를 확인
            const playerCount = await prisma.equippedPlayers.count({
                where: {
                    userID: userID,
                },
            });

            // 팀에 배치된 선수가 3명 미만인 경우에만 새 선수 추가 가능
            if (playerCount < 3) {
                // equippedPlayers 테이블에 새로운 선수 추가
                const newEquippedPlayer = await prisma.equippedPlayers.create({
                    data: {
                        userID: userID,
                        playerID: playerID,
                        powerLevel: powerLevel,
                    },
                });

                // 추가된 선수의 개별 스탯 정보를 조회
                const playerStat = await prisma.playersList.findFirst({
                    where: {
                        playerID: playerID,
                    },
                    select: {
                        speed: true,
                        finishing: true,
                        shootPower: true,
                        defense: true,
                        stamina: true,
                    },
                });

                // 사용자의 현재 총 스탯을 조회
                const userStat = await prisma.users.findFirst({
                    where: {
                        userID: userID,
                    },
                    select: {
                        stats: true,
                    },
                });

                // 사용자의 기존 스탯에 새로 추가된 선수의 스탯을 더함
                let totalStat =
                    userStat.stats +
                    playerStat.speed +
                    playerStat.finishing +
                    playerStat.shootPower +
                    playerStat.defense +
                    playerStat.stamina;

                // 업데이트된 총 스탯을 사용자 데이터에 저장
                const addStat = await prisma.users.update({
                    where: {
                        userID: userID,
                    },
                    data: {
                        stats: totalStat,
                    },
                });

                // 새롭게 추가된 팀원 정보를 응답
                return res.status(201).json({ newEquippedPlayer });
            } else {
                // 이미 팀원이 3명 이상일 때 오류 응답
                return res
                    .status(400)
                    .json({ errorMessage: '팀은 최대 3명까지만 가능합니다.' });
            }
        } catch (error) {
            // 서버 오류 처리
            console.error('오류:', error);
            return res
                .status(500)
                .json({ errorMessage: '서버 오류가 발생했습니다.' });
        }
    } else {
        // 요청된 playerID와 powerLevel을 사용자가 소유하고 있지 않으면 오류 응답
        console.log('새로운 선수입니다.');
        return res
            .status(400)
            .json({ errorMessage: '플레이어가 보유되지 않았습니다.' });
    }
});

// 팀원 삭제 엔드포인트
router.delete('/auth/deleteTeam', authMiddleware, async (req, res, next) => {
    const { userID } = req.user; // 인증된 사용자 ID
    const { playerID } = req.body; // 요청 본문에서 playerID를 추출

    // userID 또는 playerID가 없을 경우 오류 응답
    if (!userID || !playerID) {
        return res
            .status(400)
            .json({ errorMessage: 'userID 또는 playerID가 누락되었습니다.' });
    }

    try {
        // equippedPlayers 테이블에서 해당 선수 조회
        const existingPlayer = await prisma.equippedPlayers.findFirst({
            where: {
                userID: userID,
                playerID: playerID,
            },
        });

        // 만약 존재하면 해당 선수 삭제
        if (existingPlayer) {
            const deletedPlayer = await prisma.equippedPlayers.delete({
                where: {
                    userID_playerID: {
                        userID: userID,
                        playerID: playerID,
                    },
                },
            });

            // 선수 해제 시, 해당 선수의 스탯을 조회하여 사용자 총 스탯에서 차감
            const playerStat = await prisma.playersList.findFirst({
                where: {
                    playerID: playerID,
                },
                select: {
                    speed: true,
                    finishing: true,
                    shootPower: true,
                    defense: true,
                    stamina: true,
                },
            });

            const userStat = await prisma.users.findFirst({
                where: {
                    userID: userID,
                },
                select: {
                    stats: true,
                },
            });

            // 기존 사용자 스탯에서 선수 스탯 차감
            let totalStat =
                userStat.stats -
                playerStat.speed -
                playerStat.finishing -
                playerStat.shootPower -
                playerStat.defense -
                playerStat.stamina;

            // 업데이트된 스탯을 사용자 데이터에 저장
            const subStat = await prisma.users.update({
                where: {
                    userID: userID,
                },
                data: {
                    stats: totalStat,
                },
            });

            // 삭제된 팀원 정보를 응답
            return res.status(200).json({ deletedPlayer });
        } else {
            // 삭제할 선수가 존재하지 않을 때 오류 응답
            return res
                .status(404)
                .json({ errorMessage: '삭제할 팀원이 존재하지 않습니다.' });
        }
    } catch (error) {
        // 서버 오류 처리
        console.error('오류:', error);
        return res
            .status(500)
            .json({ errorMessage: '서버 오류가 발생했습니다.' });
    }
});

export default router;
