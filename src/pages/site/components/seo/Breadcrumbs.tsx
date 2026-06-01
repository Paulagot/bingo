import { Link } from 'react-router-dom';
import type { BreadcrumbItem } from './SEO';

type Props = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: Props) {
  if (items.length <= 1) return null;

  return (
    <nav className="breadcrumbs site-shell" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.item}-${item.name}`}>
              {isLast ? <span aria-current="page">{item.name}</span> : <Link to={item.item}>{item.name}</Link>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
