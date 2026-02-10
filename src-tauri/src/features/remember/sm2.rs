// Oxidian — SM-2 Spaced Repetition Algorithm
// Correct implementation with quality 0-5 scale per SuperMemo SM-2 spec.

use serde::{Deserialize, Serialize};

/// Result of an SM-2 review computation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sm2Result {
    pub interval: u32,
    pub ease_factor: f64,
    pub repetitions: u32,
}

/// Compute the next interval and ease factor using the SM-2 algorithm.
///
/// # Parameters
/// - `quality`: Response quality, 0-5 scale
///   - 5: perfect response
///   - 4: correct response after hesitation
///   - 3: correct response recalled with serious difficulty
///   - 2: incorrect response; where the correct one seemed easy to recall
///   - 1: incorrect response; the correct one remembered
///   - 0: complete blackout
/// - `repetitions`: number of consecutive correct responses (quality >= 3)
/// - `previous_interval`: last interval in days
/// - `ease_factor`: current ease factor (EF >= 1.3)
pub fn sm2_review(
    quality: u8,
    repetitions: u32,
    previous_interval: u32,
    ease_factor: f64,
) -> Sm2Result {
    let quality = quality.min(5);
    let q = quality as f64;

    // Update ease factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    let new_ef = ease_factor + (0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02));
    let new_ef = new_ef.max(1.3);

    if quality < 3 {
        // Failed — reset repetitions, interval = 1
        Sm2Result {
            interval: 1,
            ease_factor: new_ef,
            repetitions: 0,
        }
    } else {
        // Correct response
        let new_reps = repetitions + 1;
        let interval = match new_reps {
            1 => 1,
            2 => 6,
            _ => (previous_interval as f64 * new_ef).round() as u32,
        };
        let interval = interval.max(1);

        Sm2Result {
            interval,
            ease_factor: (new_ef * 100.0).round() / 100.0,
            repetitions: new_reps,
        }
    }
}

/// Compute the next review date given an interval in days from today.
pub fn next_review_date(interval: u32) -> String {
    let now = chrono::Local::now().date_naive();
    let next = now + chrono::Duration::days(interval as i64);
    next.format("%Y-%m-%d").to_string()
}

/// Get today's date as YYYY-MM-DD.
pub fn today_iso() -> String {
    chrono::Local::now().format("%Y-%m-%d").to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_first_correct_review() {
        let r = sm2_review(4, 0, 0, 2.5);
        assert_eq!(r.repetitions, 1);
        assert_eq!(r.interval, 1);
        assert!(r.ease_factor >= 1.3);
    }

    #[test]
    fn test_second_correct_review() {
        let r = sm2_review(4, 1, 1, 2.5);
        assert_eq!(r.repetitions, 2);
        assert_eq!(r.interval, 6);
    }

    #[test]
    fn test_third_correct_review() {
        let r = sm2_review(4, 2, 6, 2.5);
        assert_eq!(r.repetitions, 3);
        assert_eq!(r.interval, 15);
    }

    #[test]
    fn test_failed_review_resets() {
        let r = sm2_review(1, 5, 30, 2.5);
        assert_eq!(r.repetitions, 0);
        assert_eq!(r.interval, 1);
    }

    #[test]
    fn test_ease_factor_minimum() {
        let r = sm2_review(0, 3, 10, 1.3);
        assert!(r.ease_factor >= 1.3);
    }

    #[test]
    fn test_perfect_response_increases_ease() {
        let r = sm2_review(5, 2, 6, 2.5);
        assert!(r.ease_factor > 2.5);
    }

    #[test]
    fn test_quality_3_boundary() {
        let r = sm2_review(3, 0, 0, 2.5);
        assert_eq!(r.repetitions, 1);
        assert_eq!(r.interval, 1);
    }

    #[test]
    fn test_quality_2_is_failure() {
        let r = sm2_review(2, 3, 15, 2.5);
        assert_eq!(r.repetitions, 0);
        assert_eq!(r.interval, 1);
    }

    #[test]
    fn test_ease_factor_q4() {
        // EF' = 2.5 + (0.1 - (5-4)*(0.08+(5-4)*0.02)) = 2.5 + (0.1 - 0.1) = 2.5
        let r = sm2_review(4, 0, 0, 2.5);
        assert!((r.ease_factor - 2.5).abs() < 0.01);
    }

    #[test]
    fn test_ease_factor_q5() {
        // EF' = 2.5 + (0.1 - 0) = 2.6
        let r = sm2_review(5, 0, 0, 2.5);
        assert!((r.ease_factor - 2.6).abs() < 0.01);
    }
}
