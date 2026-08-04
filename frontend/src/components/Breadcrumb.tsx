import { Link } from "react-router-dom";
import styles from "./Breadcrumb.module.css";

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page — it renders as plain (non-link) text. */
  to?: string;
}

/** A path of crumbs, e.g. "Tasks › Queue management". The last item is
 * always rendered as the current page (no link), regardless of `to`. */
export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className={styles.breadcrumb}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className={styles.crumbGroup}>
            {i > 0 && <span className={styles.crumbSep}>›</span>}
            {!isLast && item.to ? (
              <Link className={styles.crumb} to={item.to}>
                {item.label}
              </Link>
            ) : (
              <span className={`${styles.crumb} ${styles.crumbCurrent}`}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
