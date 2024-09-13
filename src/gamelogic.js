function checkAbleGame(userTeam, opponentTeam) {
    if (userTeam.length !== 3 || opponentTeam.length !== 3) return false;
    return true;
}

function startgame(scoreA, scoreB) {
    // 최대 점수는 두 팀의 총 점수의 합으로 하시면 됩니다!
    const maxScore = scoreA + scoreB;

    const randomValue = Math.random() * maxScore;
    if (randomValue < scoreA) {
        // A 유저 승리 처리
        const aScore = Math.floor(Math.random() * 4) + 2; // 2에서 5 사이
        const bScore = Math.floor(Math.random() * Math.min(3, aScore)); // aScore보다 작은 값을 설정
        result = `A 유저 승리: A ${aScore} - ${bScore} B`;
    } else {
        // B 유저 승리 처리
        const bScore = Math.floor(Math.random() * 4) + 2; // 2에서 5 사이
        const aScore = Math.floor(Math.random() * Math.min(3, bScore)); // bScore보다 작은 값을 설정
        result = `B 유저 승리: B ${bScore} - ${aScore} A`;
    }
}

export default gamelogic;
