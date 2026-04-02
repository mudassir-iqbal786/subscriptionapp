export default function SummaryCard({ label, value, detail }) {
    return (
        <article className="summary-card">
            <s-text className="summary-card__label">{label}</s-text>
            <s-text className="summary-card__value" variant="headingLg">
                {value}
            </s-text>
            <s-text className="summary-card__detail">{detail}</s-text>
        </article>
    );
}
