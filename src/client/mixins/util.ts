/**
 * PHPなどのsleepと同じ。UI表示調整用
 */
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}