import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import {
  Alert, EmptyState, Loading, Price, StatusBadge, TagList, formatDate,
} from './ui';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setError('دستهبندیها بارگذاری نشدند'));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const query = new URLSearchParams({ search, status: 'open' });
    if (category) query.set('category', category);
    api.get(`/projects?${query}`, { signal: controller.signal })
      .then((data) => { setProjects(data.projects); setError(''); })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, category]);

  return (
    <section>
      <div className="page-header">
        <h1>پروژههای قابل دریافت پیشنهاد</h1>
        <p>پروژههای باز را بر اساس عنوان، توضیحات یا دستهبندی جستوجو کنید.</p>
      </div>

      <div className="toolbar">
        <div className="field">
          <label htmlFor="project-search">جستوجو</label>
          <input
            id="project-search" type="search" placeholder="عنوان یا توضیحات پروژه…"
            value={searchInput} onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="category-filter">دستهبندی</label>
          <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">همه دستهبندیها</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </div>
      </div>

      <Alert message={error} />
      {loading ? <Loading label="در حال بارگذاری پروژهها…" /> : (
        projects.length === 0 ? (
          <EmptyState
            title="پروژهای پیدا نشد"
            message="عبارت جستوجو یا فیلتر دیگری امتحان کنید."
            action={<button className="btn btn-secondary" type="button" onClick={() => {
              setSearchInput(''); setCategory('');
            }}>پاک کردن فیلترها</button>}
          />
        ) : (
          <>
            <p className="muted">{projects.length} پروژه یافت شد</p>
            <div className="card-grid">
              {projects.map((project) => (
                <article className="card project-card" key={project.id}>
                  <div>
                    <StatusBadge status={project.status} />
                    <h3>
                      <Link to={`/projects/${project.id}`}>{project.title}</Link>
                    </h3>
                  </div>
                  <p>{project.description}</p>
                  <div className="tags">
                    <TagList items={project.categories} />
                    <TagList items={project.skills} />
                  </div>
                  <div className="project-meta">
                    <span className="project-price"><Price project={project} /></span>
                    <span>ثبت شده: {formatDate(project.createdAt)}</span>
                  </div>
                  <Link className="btn btn-secondary btn-small" to={`/projects/${project.id}`}>
                    مشاهده جزئیات
                  </Link>
                </article>
              ))}
            </div>
          </>
        )
      )}
    </section>
  );
}

export default Projects;
