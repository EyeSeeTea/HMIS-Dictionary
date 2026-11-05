import React from "react";
import i18n from "$/utils/i18n";
import css from "./TablePagination.module.css";

export type TablePaginationProps = {
    page: number;
    pageCount: number;
    pageSize: number;
    pageSizes: number[];
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;
};

/** Page size buttons and page numbers: the first, the last and the ones around the current. */
export const TablePagination: React.FC<TablePaginationProps> = React.memo(props => {
    const { page, pageCount, pageSize, pageSizes, total, onPageChange, onPageSizeChange } = props;
    const pages = getVisiblePages(page, pageCount);

    return (
        <div className={`${css.bar} no-print`}>
            <div className={`${css.sizes} counts`} data-test="page-sizes">
                {pageSizes.map(size => (
                    <button
                        key={size}
                        type="button"
                        className={size === pageSize ? `${css.active} active` : undefined}
                        aria-pressed={size === pageSize}
                        onClick={() => onPageSizeChange(size)}
                    >
                        {size}
                    </button>
                ))}
            </div>

            <ul className={`${css.pages} pagination`} data-test="pages">
                <li>
                    <button
                        type="button"
                        aria-label={i18n.t("Previous page")}
                        disabled={page <= 1}
                        onClick={() => onPageChange(page - 1)}
                    >
                        «
                    </button>
                </li>
                {pages.map((item, index) =>
                    item === "gap" ? (
                        <li key={`gap-${index}`}>…</li>
                    ) : (
                        <li
                            key={item}
                            className={item === page ? `${css.active} active` : undefined}
                        >
                            <button type="button" onClick={() => onPageChange(item)}>
                                {item}
                            </button>
                        </li>
                    )
                )}
                <li>
                    <button
                        type="button"
                        aria-label={i18n.t("Next page")}
                        disabled={page >= pageCount}
                        onClick={() => onPageChange(page + 1)}
                    >
                        »
                    </button>
                </li>
            </ul>

            <span className={css.total}>{i18n.t("Total: {{total}}", { total })}</span>
        </div>
    );
});

export function getVisiblePages(page: number, pageCount: number): Array<number | "gap"> {
    const wanted = new Set([1, pageCount, page - 2, page - 1, page, page + 1, page + 2]);
    const numbers = Array.from(wanted)
        .filter(number => number >= 1 && number <= pageCount)
        .sort((a, b) => a - b);

    return numbers.flatMap((number, index) => {
        const previous = numbers[index - 1];
        return previous !== undefined && number - previous > 1
            ? ["gap" as const, number]
            : [number];
    });
}
