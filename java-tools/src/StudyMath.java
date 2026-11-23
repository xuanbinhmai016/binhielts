import java.math.BigDecimal;
import java.math.RoundingMode;

/** Offline calculations. Entered bands are not inferred from practice accuracy. */
public final class StudyMath {
    private StudyMath() {}

    public static BigDecimal overallBand(String... values) {
        if (values.length != 4) throw new IllegalArgumentException("Enter exactly four bands.");
        BigDecimal sum = BigDecimal.ZERO;
        for (String value : values) {
            BigDecimal band = new BigDecimal(value);
            if (band.compareTo(BigDecimal.ZERO) < 0
                    || band.compareTo(new BigDecimal("9")) > 0
                    || band.multiply(new BigDecimal("2")).stripTrailingZeros().scale() > 0) {
                throw new IllegalArgumentException("Each band must be 0 to 9 in half-band steps.");
            }
            sum = sum.add(band);
        }
        return sum.divide(new BigDecimal("4"))
                .multiply(new BigDecimal("2")).setScale(0, RoundingMode.HALF_UP)
                .divide(new BigDecimal("2")).setScale(1);
    }

    public static BigDecimal accuracy(int correct, int total) {
        if (total <= 0 || correct < 0 || correct > total)
            throw new IllegalArgumentException("Require 0 <= correct <= total and total > 0.");
        return BigDecimal.valueOf(correct).multiply(new BigDecimal("100"))
                .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
    }

    public static void main(String[] args) {
        try {
            if (args.length == 5 && args[0].equals("band")) {
                System.out.println(overallBand(args[1], args[2], args[3], args[4]));
                System.out.println("Average of entered bands only; not an assessment.");
            } else if (args.length == 3 && args[0].equals("accuracy")) {
                System.out.println(accuracy(Integer.parseInt(args[1]), Integer.parseInt(args[2])) + "%");
                System.out.println("Exercise accuracy only; not an IELTS band.");
            } else {
                throw new IllegalArgumentException("Usage: StudyMath band L R W S | accuracy correct total");
            }
        } catch (IllegalArgumentException error) {
            System.err.println("Error: " + error.getMessage());
            System.exit(1);
        }
    }
}
