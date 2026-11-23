import java.math.BigDecimal;

/** Dependency-free executable tests: assertions run even without Java's -ea flag. */
public final class StudyMathTest {
    private static int checks = 0;
    private static void equal(String expected, BigDecimal actual) {
        if (actual.compareTo(new BigDecimal(expected)) != 0)
            throw new AssertionError("Expected " + expected + ", got " + actual);
        checks++;
    }
    private static void rejects(Runnable action) {
        try { action.run(); }
        catch (IllegalArgumentException expected) { checks++; return; }
        throw new AssertionError("Expected invalid input to be rejected.");
    }
    public static void main(String[] args) {
        equal("7.5", StudyMath.overallBand("7", "7", "7.5", "7.5"));
        equal("8", StudyMath.overallBand("7.5", "7.5", "8", "8"));
        equal("0", StudyMath.overallBand("0", "0", "0", "0"));
        equal("9", StudyMath.overallBand("9", "9", "9", "9"));
        equal("33.33", StudyMath.accuracy(1, 3));
        equal("100", StudyMath.accuracy(4, 4));
        rejects(() -> StudyMath.overallBand("7.2", "7", "7", "7"));
        rejects(() -> StudyMath.overallBand("10", "7", "7", "7"));
        rejects(() -> StudyMath.overallBand("NaN", "7", "7", "7"));
        rejects(() -> StudyMath.overallBand("7"));
        rejects(() -> StudyMath.accuracy(3, 2));
        rejects(() -> StudyMath.accuracy(0, 0));
        System.out.println(checks + " checks passed.");
    }
}
